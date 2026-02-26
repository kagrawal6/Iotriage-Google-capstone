import nmap
import socket

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
    
def scan_network(scanner, target_network):
	"""
	Scans the given target network using nmap with flags for OS and version detection.
	"""
	options = "-T4 -O -sV -v"
	print(f"Starting scan on network: {target_network}")
	scanner.scan(target_network, arguments=options)
	print("Scan complete!")
     
def parse_scan_to_json(scanner):
     pass  
	# TODO: Implement a function to parse nmap scan results into JSON format for easier consumption

def main():
    scanner = nmap.PortScanner()

    # Local ip is used for determining the target to scan in nmap
    local_ip = get_local_ip()

    if local_ip:
        # Strip the last octet and add '.0/24' to scan the whole subnet
        # Ex: turns '192.168.1.50' into '192.168.1.0/24'
        target_network = f"{local_ip.rsplit('.', 1)[0]}.0/24"

        scan_network(scanner, target_network)
        
        # TODO: Find a way to display intermediary results / progress and parse into JSON
        parse_scan_to_json(scanner)
        
        print("Scan complete!")
    else:
        print("Could not determine local network to scan.")

if __name__ == "__main__":
    main()