# gui_app.py
import tkinter as tk
from tkinter import scrolledtext, messagebox
import threading
import sys
import nmap  # We still need this here to initialize the scanner and catch nmap errors
import script as scanner_logic

class PrintRedirector:
    """Helper class to redirect standard print() statements to the GUI text box."""
    def __init__(self, text_widget):
        self.text_widget = text_widget

    def write(self, text):
        self.text_widget.config(state=tk.NORMAL)
        self.text_widget.insert(tk.END, text)
        self.text_widget.see(tk.END) # Auto-scroll to bottom
        self.text_widget.config(state=tk.DISABLED)

    def flush(self):
        pass

class ScannerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Network Scanner Wizard")
        self.root.geometry("550x450")
        self.root.resizable(False, False)

        # 1. Agreement Text
        agreement_text = (
            "Network Scanner Agreement\n\n"
            "By checking the box below, you confirm that you have explicit "
            "permission and authorization to scan the local network you are "
            "currently connected to. Unauthorized scanning is strictly prohibited."
        )
        self.lbl_agreement = tk.Label(root, text=agreement_text, justify=tk.LEFT, wraplength=500)
        self.lbl_agreement.pack(pady=15, padx=20, anchor="w")

        # 2. Checkbox
        self.agree_var = tk.BooleanVar()
        self.chk_agree = tk.Checkbutton(
            root, text="I agree and have authorization to scan this network.", 
            variable=self.agree_var, command=self.toggle_run_button
        )
        self.chk_agree.pack(padx=20, anchor="w")

        # 3. Log Output Area (Scrolled Text)
        self.log_area = scrolledtext.ScrolledText(root, width=60, height=12, state=tk.DISABLED)
        self.log_area.pack(pady=15, padx=20)

        # Redirect standard output (print statements) to the log area
        sys.stdout = PrintRedirector(self.log_area)

        # 4. Bottom Frame for Button
        self.bottom_frame = tk.Frame(root)
        self.bottom_frame.pack(fill=tk.X, side=tk.BOTTOM, pady=15, padx=20)

        self.btn_run = tk.Button(
            self.bottom_frame, text="Run Scan", width=15, 
            state=tk.DISABLED, command=self.start_scan_thread
        )
        self.btn_run.pack(side=tk.RIGHT)

    def toggle_run_button(self):
        """Enables the run button only if the agreement is checked."""
        if self.agree_var.get():
            self.btn_run.config(state=tk.NORMAL)
        else:
            self.btn_run.config(state=tk.DISABLED)

    def start_scan_thread(self):
        """Starts the scan in a background thread to keep the GUI responsive."""
        self.btn_run.config(state=tk.DISABLED)
        self.chk_agree.config(state=tk.DISABLED)
        self.log_area.config(state=tk.NORMAL)
        self.log_area.delete(1.0, tk.END) 
        self.log_area.config(state=tk.DISABLED)

        scan_thread = threading.Thread(target=self.run_scan_logic)
        scan_thread.daemon = True
        scan_thread.start()

    def run_scan_logic(self):
        """The actual scanning process."""
        try:
            print("Initializing scanner...")
            scanner = nmap.PortScanner()
            
            # Calling the functions from our imported scanner_logic.py file!
            local_ip = scanner_logic.get_local_ip()

            if local_ip:
                target_network = f"{local_ip.rsplit('.', 1)[0]}.0/24"
                scanner_logic.scan_network(scanner, target_network)
                scanner_logic.parse_scan_to_json(scanner)
                
                print("--- ALL OPERATIONS COMPLETE ---")
                messagebox.showinfo("Success", "Network scan complete and saved to JSON!")
            else:
                print("Could not determine local network to scan.")
                messagebox.showerror("Error", "Could not determine local network.")
        
        except nmap.PortScannerError as e:
            print(f"Nmap Error: {e}")
            messagebox.showerror("Nmap Error", "Nmap is either not installed or requires administrator privileges.")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
        
        finally:
            self.chk_agree.config(state=tk.NORMAL)
            self.toggle_run_button()

if __name__ == "__main__":
    root = tk.Tk()
    app = ScannerApp(root)
    root.mainloop()