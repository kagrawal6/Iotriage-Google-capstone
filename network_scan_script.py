import nmap
import socket
import json
from cpe import CPE

def get_local_ip():
    """
    Gets the local IP address of the machine by creating a dummy socket connection.
    This works universally on Windows, macOS, and Linux.
    """
    try:
        # Create a UDP socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # We don't actually send data, we just connect to a public IP (Google DNS)
        # to force the OS to determine the default routing IP.
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        print(f"Detected Local IP: {local_ip}")
        return local_ip
    except Exception as e:
        print(f"Error getting local IP: {e}")
        return None

def convert_cpe_list_version(cpe_input):
    """
    Converts a CPE 2.2 string to CPE 2.3 for easier search using NVD database.
    """
    # 1. Handle empty inputs
    if not cpe_input:
        return []

    # 2. Force input into a list if nmap returns a single string
    if isinstance(cpe_input, str):
        cpe_input = [cpe_input]

    converted_cpes = []
    
    # 3. Safely parse each CPE
    for cpe in cpe_input:
        try:
            cpe_obj = CPE(cpe, CPE.VERSION_2_2)
            converted_cpes.append(cpe_obj.as_fs())
        except Exception as e:
            # If nmap gives a malformed CPE, log it and keep the original string
            print(f"  [!] Warning: Could not convert malformed CPE '{cpe}': {e}")
            converted_cpes.append(cpe)

    # 4. Return the new list so the JSON dictionary can store it
    return converted_cpes

def scan_network(scanner, target_network):
    """
    Scans the given target network using nmap with flags for OS and version detection.
    """
    options = "-T4 -O -sV -v"
    print(f"Starting scan on network: {target_network}")
    scanner.scan(target_network, arguments=options)
    print("Scan complete!")
     
def parse_scan_to_json(scanner, output_filename="scan_results.json"):
    """
    Parses the raw python-nmap dictionary into JSON format
    """
    print("Parsing scan data to JSON...")
    extracted_data = []

    for host in scanner.all_hosts():
        if scanner[host].state() != 'up':
            continue

        # 1. Extract Device Name (Hostname)
        # Nmap returns a list of dictionaries for hostnames. We want the first valid name.
        hostnames = scanner[host].get('hostnames', [])
        device_name = "Unknown"
        for hn in hostnames:
            if hn.get('name'):
                device_name = hn['name']
                break

        # 2. Extract Device Type
        device_type = "Unknown"
        if 'osmatch' in scanner[host] and len(scanner[host]['osmatch']) > 0:
            best_os_match = scanner[host]['osmatch'][0]
            if 'osclass' in best_os_match and len(best_os_match['osclass']) > 0:
                device_type = best_os_match['osclass'][0].get('type', 'Unknown')

        # 3. Setup the base device info dictionary
        device_info = {
            "ip_address": host,
            "mac_address": scanner[host]['addresses'].get('mac', 'Unknown'),
            "device_name": device_name,
            "device_type": device_type,
            "os_matches": [],
            "open_ports": []
        }

        # 4. Extract OS matches and OS CPEs
        if 'osmatch' in scanner[host]:
            for os in scanner[host]['osmatch']:
                cpe_list = []
                if 'osclass' in os and len(os['osclass']) > 0:
                    cpe_list = os['osclass'][0].get('cpe', [])

                device_info['os_matches'].append({
                    "name": os['name'],
                    "accuracy": os['accuracy'],
                    "cpe": convert_cpe_list_version(cpe_list)
                })

        # 5. Extract Open Ports, Services, and Service CPEs
        for proto in scanner[host].all_protocols():
            ports = scanner[host][proto].keys()
            for port in ports:
                port_data = scanner[host][proto][port]
                
                if port_data['state'] == 'open':
                    device_info['open_ports'].append({
                        "port": port,
                        "protocol": proto,
                        "service": port_data.get('name', 'Unknown'),
                        "product": port_data.get('product', 'Unknown'),
                        "version": port_data.get('version', 'Unknown'),
                        "cpe": convert_cpe_list_version(port_data.get('cpe', []))
                    })

        extracted_data.append(device_info)

    # Save to file
    with open(output_filename, 'w') as json_file:
        json.dump(extracted_data, json_file, indent=4)
        
    print(f"Results successfully saved to '{output_filename}'")

def main():
    scanner = nmap.PortScanner()

    # Local ip is used for determining the target to scan in nmap
    local_ip = get_local_ip()

    if local_ip:
        # Strip the last octet and add '.0/24' to scan the whole subnet
        # Ex: turns '192.168.1.50' into '192.168.1.0/24'
        target_network = f"{local_ip.rsplit('.', 1)[0]}.0/24"

        scan_network(scanner, target_network)
        
        parse_scan_to_json(scanner)
        
        print("Scan complete!")
    else:
        print("Could not determine local network to scan.")

if __name__ == "__main__":
    main()