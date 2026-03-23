import tkinter as tk
from tkinter import scrolledtext, messagebox, filedialog
import threading
import queue
import sys
import ctypes
import os
import traceback

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
    pythonw = sys.executable.replace("python.exe", "pythonw.exe")
    ctypes.windll.shell32.ShellExecuteW(None, "runas", pythonw, f'"{script}" {params}', None, 1)
    sys.exit(0)


class QueueRedirector:
    """Puts print() output into a thread-safe queue instead of writing directly to tkinter."""
    def __init__(self, log_queue):
        self.log_queue = log_queue

    def write(self, text):
        self.log_queue.put(text)

    def flush(self):
        pass


class ScannerApp:
    def __init__(self, root):
        self.root = root
        self.root.resizable(False, False)
        self.log_queue = queue.Queue()

        if is_admin():
            self.root.title("Network Scanner Wizard [Administrator]")
            self.root.geometry("550x520")
        else:
            self.root.title("Network Scanner Wizard [WARNING: Not Admin]")
            self.root.geometry("550x570")

        # --- Agreement ---
        agreement_text = (
            "Network Scanner Agreement\n\n"
            "By checking the box below, you confirm that you have explicit "
            "permission and authorization to scan the local network you are "
            "currently connected to. Unauthorized scanning is strictly prohibited."
        )
        tk.Label(root, text=agreement_text, justify=tk.LEFT, wraplength=500).pack(pady=15, padx=20, anchor="w")

        self.agree_var = tk.BooleanVar()
        self.chk_agree = tk.Checkbutton(
            root, text="I agree and have authorization to scan this network.",
            variable=self.agree_var, command=self.toggle_run_button
        )
        self.chk_agree.pack(padx=20, anchor="w")

        # --- Admin warning ---
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

        # --- Save location ---
        tk.Label(root, text="Save results to:", anchor="w").pack(padx=20, pady=(12, 0), anchor="w")

        save_frame = tk.Frame(root)
        save_frame.pack(fill=tk.X, padx=20, pady=(2, 0))

        downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
        default_save_path = os.path.join(downloads_path, "scan_results.json")
        self.save_path_var = tk.StringVar(value=default_save_path)

        self.entry_save_path = tk.Entry(save_frame, textvariable=self.save_path_var, width=46)
        self.entry_save_path.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.btn_browse = tk.Button(save_frame, text="Browse…", command=self.browse_save_path)
        self.btn_browse.pack(side=tk.LEFT, padx=(6, 0))

        # --- Log area ---
        self.log_area = scrolledtext.ScrolledText(root, width=60, height=12, state=tk.DISABLED)
        self.log_area.pack(pady=15, padx=20)

        # Redirect both stdout and stderr to the queue
        sys.stdout = QueueRedirector(self.log_queue)
        sys.stderr = QueueRedirector(self.log_queue)

        # --- Bottom buttons ---
        self.bottom_frame = tk.Frame(root)
        self.bottom_frame.pack(fill=tk.X, side=tk.BOTTOM, pady=15, padx=20)

        self.btn_run = tk.Button(
            self.bottom_frame, text="Run Scan", width=15,
            state=tk.DISABLED, command=self.start_scan_thread
        )
        self.btn_run.pack(side=tk.RIGHT)

        # Start polling the queue every 100ms
        self.root.after(100, self.poll_log_queue)

    def poll_log_queue(self):
        """Drain the queue and write messages to the log widget on the main thread."""
        while True:
            try:
                message = self.log_queue.get_nowait()
            except queue.Empty:
                break
            self.log_area.config(state=tk.NORMAL)
            self.log_area.insert(tk.END, message)
            self.log_area.see(tk.END)
            self.log_area.config(state=tk.DISABLED)
        self.root.after(100, self.poll_log_queue)

    def browse_save_path(self):
        initial_dir = os.path.dirname(self.save_path_var.get()) or os.path.expanduser("~")
        chosen = filedialog.asksaveasfilename(
            title="Choose where to save scan results",
            initialdir=initial_dir,
            initialfile="scan_results.json",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if chosen:
            self.save_path_var.set(chosen)

    def _prompt_elevation(self):
        if messagebox.askyesno("Restart Required", "The app will close and re-open with a UAC (admin) prompt.\n\nContinue?"):
            run_as_admin()

    def toggle_run_button(self):
        self.btn_run.config(state=tk.NORMAL if self.agree_var.get() else tk.DISABLED)

    def _run_scan(self, save_path):
        """Wrapper that runs the scan and catches any exceptions so they show in the log."""
        try:
            self.log_queue.put("Initializing scan...\n")

            # Temporarily patch the output filename into the scanner module
            # so main() uses our chosen path without needing any changes to it.
            original_parse = scanner_logic.parse_scan_to_json
            scanner_logic.parse_scan_to_json = lambda scanner, filename=save_path: original_parse(scanner, filename)

            scanner_logic.main()

            scanner_logic.parse_scan_to_json = original_parse  # restore original
            self.log_queue.put("\n✔ Scan finished successfully!\n")
        except Exception as e:
            self.log_queue.put(f"\n--- ERROR ---\n{traceback.format_exc()}\n")
        finally:
            self.root.after(0, self._scan_done)

    def _scan_done(self):
        """Re-enables all controls after scan completes or fails."""
        self.btn_run.config(state=tk.NORMAL)
        self.chk_agree.config(state=tk.NORMAL)
        self.btn_browse.config(state=tk.NORMAL)
        self.entry_save_path.config(state=tk.NORMAL)

    def start_scan_thread(self):
        save_path = self.save_path_var.get().strip()

        if not save_path:
            messagebox.showerror("No save path", "Please choose a location to save the results before scanning.")
            return

        save_dir = os.path.dirname(save_path)
        if save_dir and not os.path.isdir(save_dir):
            messagebox.showerror("Invalid path", f"The folder does not exist:\n{save_dir}\n\nPlease choose a valid location.")
            return

        self.btn_run.config(state=tk.DISABLED)
        self.chk_agree.config(state=tk.DISABLED)
        self.btn_browse.config(state=tk.DISABLED)
        self.entry_save_path.config(state=tk.DISABLED)
        self.log_area.config(state=tk.NORMAL)
        self.log_area.delete(1.0, tk.END)
        self.log_area.config(state=tk.DISABLED)

        scan_thread = threading.Thread(target=self._run_scan, args=(save_path,))
        scan_thread.daemon = True
        scan_thread.start()


if __name__ == "__main__":
    if not is_admin():
        run_as_admin()
    root = tk.Tk()
    app = ScannerApp(root)
    root.mainloop()