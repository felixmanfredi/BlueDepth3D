import subprocess
import time
import os
import signal
import psutil

# ====================================================================
# CONFIGURAZIONE
# ====================================================================
INPUT_A = "rtsp://admin:%40nirvana84@192.168.1.252:5544/live0.26"
INPUT_B = "rtsp://admin:%40nirvana84@192.168.1.251:5544/live0.26"

# Indirizzo INTERNO dove lo script "spinge" i dati
PUSH_URL = "rtmp://127.0.0.1:1935/live/internal_stream"

# Indirizzo di OUTPUT HTTP Live Streaming (HLS) per la visualizzazione
# Sarà disponibile a http://127.0.0.1:8080/hls/internal_stream.m3u8
HLS_OUTPUT_DIR = "/tmp/hls_output"
HLS_PORT = 8080

# Variabili di stato globale
current_pusher_process = None
current_stream_name = None
rtmp_server_process = None # Il processo FFmpeg che funge da server

# ====================================================================
# FUNZIONI PER IL SERVER RTMP/HLS (Riceve RTMP, Emette HLS)
# ====================================================================

def start_rtmp_hls_server():
    """Avvia il server FFmpeg che riceve RTMP e crea un output HLS."""
    global rtmp_server_process
    
    if os.path.exists(HLS_OUTPUT_DIR):
        subprocess.run(f"rm -rf {HLS_OUTPUT_DIR}", shell=True)
    os.makedirs(HLS_OUTPUT_DIR, exist_ok=True)

    # Il server RTMP/HLS: riceve RTMP e lo converte in HLS
    # NOTA: Questo comando è complesso e instabile; è solo per test.
    server_command = [
        'ffmpeg',
        '-listen', '1',          # Abilita la modalità server RTMP
        '-i', 'rtmp://127.0.0.1:1935/live/internal_stream',
        '-c', 'copy',            # Non ricodificare (spingiamo già dati validi)
        '-map', '0:v:0',         # Mappa solo il video
        '-f', 'hls',
        '-hls_time', '2',        # Dimensione segmenti HLS (2 secondi)
        '-hls_list_size', '3',   # Mantiene solo gli ultimi 3 segmenti
        f'{HLS_OUTPUT_DIR}/internal_stream.m3u8'
    ]
    
    # Avvia anche un server HTTP per servire i file HLS
    # Utilizzeremo il modulo http.server di Python per semplicità
    http_server_command = ['python3', '-m', 'http.server', str(HLS_PORT)]
    
    try:
        print(f"📡 Avvio Server RTMP (Porta 1935) e Server HTTP (Porta {HLS_PORT})...")
        # Avvia il server RTMP/HLS (in background)
        rtmp_server_process = subprocess.Popen(server_command, stdin=subprocess.PIPE, preexec_fn=os.setsid, cwd=HLS_OUTPUT_DIR, stderr=subprocess.DEVNULL)
        
        # Avvia il server HTTP per servire i file HLS (in background)
        # Troviamo il PID del processo Python per gestirlo in seguito
        http_server_process = subprocess.Popen(http_server_command, cwd=HLS_OUTPUT_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Manteniamo il PID del processo http.server per la terminazione
        rtmp_server_process.http_pid = http_server_process.pid 
        
        time.sleep(3) # Tempo di attesa per l'avvio del server
        print(f"✅ Server pronto. Flusso visualizzabile a: http://127.0.0.1:{HLS_PORT}/internal_stream.m3u8")
        
    except Exception as e:
        print(f"❌ Errore nell'avvio del server RTMP/HLS: {e}")
        stop_all_processes()
        exit(1)


def stop_all_processes():
    """Termina tutti i processi FFmpeg e server avviati."""
    global current_pusher_process, rtmp_server_process
    
    # 1. Termina il pusher attivo
    if current_pusher_process and current_pusher_process.poll() is None:
        print("🛑 Terminazione Pusher attivo...")
        try:
            os.killpg(os.getpgid(current_pusher_process.pid), signal.SIGTERM)
            current_pusher_process.wait(timeout=5)
        except: pass
        current_pusher_process = None

    # 2. Termina il server RTMP/HLS
    if rtmp_server_process and rtmp_server_process.poll() is None:
        print("🛑 Terminazione Server RTMP/HLS e HTTP...")
        # Termina il server RTMP (FFmpeg)
        try:
            os.killpg(os.getpgid(rtmp_server_process.pid), signal.SIGTERM)
            rtmp_server_process.wait(timeout=5)
        except: pass
        
        # Termina il server HTTP
        if hasattr(rtmp_server_process, 'http_pid'):
            try:
                os.kill(rtmp_server_process.http_pid, signal.SIGTERM)
            except: pass
            
        rtmp_server_process = None
        subprocess.run(f"rm -rf {HLS_OUTPUT_DIR}", shell=True) # Pulisce i file HLS

# ====================================================================
# FUNZIONI DI SWITCHING (Il "Pusher" verso il Server)
# ====================================================================

def start_pusher_stream(stream_url, name):
    """Avvia il processo FFmpeg che SPINGE (push) il flusso al server RTMP."""
    global current_pusher_process, current_stream_name

    # Il comando push: prende RTSP e lo spinge come RTMP
    command = [
        'ffmpeg',
        '-i', stream_url,
        '-c', 'copy',
        '-f', 'flv',
        PUSH_URL
    ]
    
    print(f"▶️ Avvio Pusher Flusso {name}: {stream_url} -> {PUSH_URL}")
    
    # Avvia FFmpeg in un nuovo processo
    process = subprocess.Popen(command, stdin=subprocess.PIPE, preexec_fn=os.setsid, stderr=subprocess.DEVNULL)
    
    current_pusher_process = process
    current_stream_name = name
    print(f"Pusher avviato con PID: {process.pid}")

def stop_current_pusher():
    """Termina il pusher FFmpeg attivo."""
    global current_pusher_process
    
    if current_pusher_process and current_pusher_process.poll() is None:
        print(f"🛑 Terminazione Pusher attivo ({current_stream_name}, PID: {current_pusher_process.pid})...")
        
        try:
            # Uccide l'intero gruppo di processi del pusher
            os.killpg(os.getpgid(current_pusher_process.pid), signal.SIGTERM)
        except ProcessLookupError:
            pass

        current_pusher_process.wait(timeout=5)
        current_pusher_process = None
        time.sleep(1) # Breve pausa per stabilizzazione del server
        print("Pusher terminato.")
    elif current_pusher_process:
        current_pusher_process = None

def switch_stream():
    """Esegue lo switch tra i due flussi."""
    stop_current_pusher()
    
    if current_stream_name == 'A':
        start_pusher_stream(INPUT_B, 'B')
    elif current_stream_name == 'B':
        start_pusher_stream(INPUT_A, 'A')
    else:
        # Se non c'è nulla di attivo, avvia A per default
        start_pusher_stream(INPUT_A, 'A')

def show_status():
    """Mostra lo stato corrente."""
    is_pusher_running = current_pusher_process and current_pusher_process.poll() is None
    is_server_running = rtmp_server_process and rtmp_server_process.poll() is None
    
    print("\n----- STATO -----\n")
    if is_server_running:
        print(f"Server RTMP/HLS: ATTIVO (PID: {rtmp_server_process.pid}, HTTP PID: {rtmp_server_process.http_pid})")
        print(f"URL di visualizzazione HLS: http://127.0.0.1:{HLS_PORT}/internal_stream.m3u8")
    else:
        print("Server RTMP/HLS: INATTIVO o Fallito!")

    if is_pusher_running:
        print(f"Pusher Attivo: {current_stream_name} (PID: {current_pusher_process.pid})")
    else:
        print("Pusher Attivo: INATTIVO.")
    print("\n-----------------\n")

def main_loop():
    """Ciclo principale per l'interfaccia a riga di comando."""
    start_rtmp_hls_server()
    
    # Avvia automaticamente il primo flusso
    start_pusher_stream(INPUT_A, 'A')

    while True:
        try:
            print("\n-------------------------------------------")
            print("Comandi: [s]witch, [status], [q]uit")
            choice = input("Inserisci comando: ").strip().lower()

            if choice == 's':
                switch_stream()
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
    stop_all_processes()
    print("\nSwitcher terminato e processi puliti.")

if __name__ == '__main__':
    main_loop()