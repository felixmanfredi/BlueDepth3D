import subprocess
import time
import os
import signal

# ====================================================================
# CONFIGURAZIONE
# ====================================================================
INPUT_A = "rtsp://admin:%40nirvana84@192.168.1.252:5544/live0.26"
INPUT_B = "rtsp://admin:%40nirvana84@192.168.1.251:5544/live0.26"

# Indirizzo di output RTMP fisso. Un server RTMP (es. Nginx-RTMP) deve essere in ascolto qui.
OUTPUT_URL = "rtmp://127.0.0.1/live/switched_stream"

# Processo FFmpeg attualmente attivo
current_process = None
current_stream_name = None

def start_stream(stream_url, name):
    """Avvia un processo FFmpeg per lo streaming."""
    global current_process, current_stream_name

    # Comando FFmpeg: '-c copy' per evitare ricodifica (più veloce)
    command = [
        'ffmpeg',
        '-i', stream_url,
        '-c', 'copy',
        '-f', 'flv',
        OUTPUT_URL
    ]
    
    print(f"▶️ Avvio Flusso {name}: {stream_url} -> {OUTPUT_URL}")
    
    # Avvia FFmpeg in un nuovo processo
    process = subprocess.Popen(command, stdin=subprocess.PIPE, preexec_fn=os.setsid)
    
    current_process = process
    current_stream_name = name
    print(f"Processo avviato con PID: {process.pid}")

def stop_current_stream():
    """Termina il processo FFmpeg attualmente in esecuzione."""
    global current_process
    
    if current_process and current_process.poll() is None:
        print(f"🛑 Terminazione del flusso attivo ({current_stream_name}, PID: {current_process.pid})...")
        
        # Uccide l'intero gruppo di processi (incluso FFmpeg) per pulizia
        try:
            os.killpg(os.getpgid(current_process.pid), signal.SIGTERM)
        except ProcessLookupError:
            pass  # Processo già terminato

        current_process.wait(timeout=5)  # Attende la terminazione
        current_process = None
        time.sleep(2)  # Pausa necessaria per la pulizia della connessione RTMP
        print("Flusso terminato.")
    elif current_process:
        print("Il processo FFmpeg era già terminato o fallito.")
        current_process = None

def switch_stream():
    """Esegue lo switch tra i due flussi."""
    stop_current_stream()
    
    if current_stream_name == 'A':
        start_stream(INPUT_B, 'B')
    elif current_stream_name == 'B':
        start_stream(INPUT_A, 'A')
    else:
        # Se non c'è nulla di attivo, avvia A per default
        start_stream(INPUT_A, 'A')

def show_status():
    """Mostra lo stato corrente."""
    if current_process and current_process.poll() is None:
        print(f"Stato: ATTIVO. Flusso corrente: {current_stream_name}")
        print(f"FFmpeg PID: {current_process.pid}")
    else:
        print("Stato: INATTIVO. Nessun flusso in corso.")

def main_loop():
    """Ciclo principale per l'interfaccia a riga di comando."""
    print("Inizializzazione dello Switcher RTSP.")
    show_status()

    while True:
        try:
            print("\n-------------------------------------------")
            print("Comandi: [s]witch, [a]vvia A, [b]vvia B, [t]ermina, [q]uit, [status]")
            choice = input("Inserisci comando: ").strip().lower()

            if choice == 's':
                switch_stream()
            elif choice == 'a':
                stop_current_stream()
                start_stream(INPUT_A, 'A')
            elif choice == 'b':
                stop_current_stream()
                start_stream(INPUT_B, 'B')
            elif choice == 't':
                stop_current_stream()
            elif choice == 'status':
                show_status()
            elif choice == 'q':
                break
            else:
                print("Comando non valido. Riprova.")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Errore: {e}")
            break

    # Pulizia finale prima di uscire
    stop_current_stream()
    print("\nSwitcher terminato.")

if __name__ == '__main__':
    main_loop()