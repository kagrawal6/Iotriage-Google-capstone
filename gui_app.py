import tkinter as tk
from tkinter import scrolledtext, messagebox
import threading
import sys
import ctypes
import os

# Ensure scanner.py is always found from this file's directory,
# even when relaunched as Administrator with a different working directory
_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

import network_scan_script as scanner_logic


def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_as_admin():
    script = os.path.abspath(sys.argv[0])
    params = " ".join([f'"{arg}"' for arg in sys.argv[1:]])
    ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, f'"{script}" {params}', None, 1)
    sys.exit(0)


class PrintRedirector:
    def __init__(self, text_widget):
        self.text_widget = text_widget

    def write(self, text):
        self.text_widget.config(state=tk.NORMAL)
        self.text_widget.insert(tk.END, text)
        self.text_widget.see(tk.END)
        self.text_widget.config(state=tk.DISABLED)

    def flush(self):
        pass


class ScannerApp:
    def __init__(self, root):
        self.root = root
        self.root.resizable(False, False)

        if is_admin():
            self.root.title("Network Scanner Wizard [Administrator]")
            self.root.geometry("550x450")
        else:
            self.root.title("Network Scanner Wizard [WARNING: Not Admin]")
            self.root.geometry("550x500")

        agreement_text = (
            "Network Scanner Agreement\n\n"
            "By checking the box below, you confirm that you have explicit "
            "permission and authorization to scan the local network you are "
            "currently connected to. Unauthorized scanning is strictly prohibited."
        )
        self.lbl_agreement = tk.Label(root, text=agreement_text, justify=tk.LEFT, wraplength=500)
        self.lbl_agreement.pack(pady=15, padx=20, anchor="w")

        self.agree_var = tk.BooleanVar()
        self.chk_agree = tk.Checkbutton(
            root, text="I agree and have authorization to scan this network.",
            variable=self.agree_var, command=self.toggle_run_button
        )
        self.chk_agree.pack(padx=20, anchor="w")

        if not is_admin():
            tk.Label(
                root,
                text="⚠ OS detection requires Administrator. Click below to restart with elevated privileges.",
                fg="orange", wraplength=500, justify=tk.LEFT
            ).pack(padx=20, pady=(8, 2), anchor="w")

            tk.Button(
                root, text="Restart as Administrator",
                fg="white", bg="#c0392b", command=self._prompt_elevation
            ).pack(padx=20, pady=(0, 4), anchor="w")

        self.log_area = scrolledtext.ScrolledText(root, width=60, height=12, state=tk.DISABLED)
        self.log_area.pack(pady=15, padx=20)

        sys.stdout = PrintRedirector(self.log_area)

        self.bottom_frame = tk.Frame(root)
        self.bottom_frame.pack(fill=tk.X, side=tk.BOTTOM, pady=15, padx=20)

        self.btn_run = tk.Button(
            self.bottom_frame, text="Run Scan", width=15,
            state=tk.DISABLED, command=self.start_scan_thread
        )
        self.btn_run.pack(side=tk.RIGHT)

    def _prompt_elevation(self):
        if messagebox.askyesno("Restart Required", "The app will close and re-open with a UAC (admin) prompt.\n\nContinue?"):
            run_as_admin()

    def toggle_run_button(self):
        self.btn_run.config(state=tk.NORMAL if self.agree_var.get() else tk.DISABLED)

    def start_scan_thread(self):
        self.btn_run.config(state=tk.DISABLED)
        self.chk_agree.config(state=tk.DISABLED)
        self.log_area.config(state=tk.NORMAL)
        self.log_area.delete(1.0, tk.END)
        self.log_area.config(state=tk.DISABLED)

        scan_thread = threading.Thread(target=scanner_logic.main)
        scan_thread.daemon = True
        scan_thread.start()


if __name__ == "__main__":
    root = tk.Tk()
    app = ScannerApp(root)
    root.mainloop()