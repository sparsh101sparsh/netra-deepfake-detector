#!/usr/bin/env bash
# ==============================================================================
# NETRA — Autonomous Forensic SQS Worker Runner
# 
# Usage:
#   bash scripts/run_worker.sh          # Run standard SQS worker daemon
#   bash scripts/run_worker.sh --dev    # Run in development mode (verbose logging)
#   bash scripts/run_worker.sh --check  # Pre-flight environment check and exit
#   bash scripts/run_worker.sh --help   # Display usage and environment help
# ==============================================================================

set -eo pipefail

# ANSI color codes for rich terminal output
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_DIM="\033[2m"
CLR_CYAN="\033[36m"
CLR_GREEN="\033[32m"
CLR_YELLOW="\033[33m"
CLR_RED="\033[31m"
CLR_MAGENTA="\033[35m"
CLR_BLUE="\033[34m"

# ------------------------------------------------------------------------------
# 1. Resolve Root Directory and Environment
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

DEV_MODE=0
CHECK_ONLY=0
CUSTOM_WORKER_ID=""

# Parse command line flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev|-d)
      DEV_MODE=1
      shift
      ;;
    --check|-c)
      CHECK_ONLY=1
      shift
      ;;
    --worker-id|-w)
      CUSTOM_WORKER_ID="$2"
      shift 2
      ;;
    --help|-h)
      echo -e "${CLR_BOLD}NETRA Forensic SQS Worker Runner${CLR_RESET}"
      echo ""
      echo -e "${CLR_CYAN}Usage:${CLR_RESET}"
      echo "  bash scripts/run_worker.sh [OPTIONS]"
      echo ""
      echo -e "${CLR_CYAN}Options:${CLR_RESET}"
      echo "  --dev, -d             Enable development mode with debug logging"
      echo "  --check, -c           Run pre-flight environment checks and exit"
      echo "  --worker-id, -w <id>  Set custom worker identification string"
      echo "  --help, -h            Show this help message and exit"
      echo ""
      echo -e "${CLR_CYAN}Environment Variables:${CLR_RESET}"
      echo "  AWS_DEFAULT_REGION    AWS region (default: us-east-1)"
      echo "  SQS_QUEUE_URL         Target SQS Queue URL for forensic jobs"
      echo "  DYNAMO_TABLE_JOBS     DynamoDB table for job state (default: netra-jobs)"
      echo "  DYNAMO_TABLE_WORKERS  DynamoDB table for worker presence (default: netra-workers)"
      echo "  S3_BUCKET_MEDIA       S3 bucket for media payloads (default: netra-media-uploads)"
      exit 0
      ;;
    *)
      # Pass through any unknown arguments to python
      break
      ;;
  esac
done

# ------------------------------------------------------------------------------
# 2. Display ASCII Banner
# ------------------------------------------------------------------------------
echo -e "${CLR_CYAN}${CLR_BOLD}"
cat << 'EOF'
 ╔═════════════════════════════════════════════════════════════════════════════╗
 ║   _   _ _____ _____ ____      _                                             ║
 ║  | \ | | ____|_   _|  _ \    / \     NETRA FORENSIC TRIAGE GRID             ║
 ║  |  \| |  _|   | | | |_) |  / _ \    Autonomous SQS Worker Daemon           ║
 ║  | |\  | |___  | | |  _ <  / ___ \   Multi-Modal Neural Inference Fleet     ║
 ║  |_| \_|_____| |_| |_| \_\/_/   \_\  Version 5.1.0                          ║
 ╚═════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${CLR_RESET}"

# ------------------------------------------------------------------------------
# 3. Locate and Activate Python Virtual Environment
# ------------------------------------------------------------------------------
PYTHON_BIN=""

if [[ -n "${VIRTUAL_ENV:-}" && -x "${VIRTUAL_ENV}/bin/python" ]]; then
  PYTHON_BIN="${VIRTUAL_ENV}/bin/python"
elif [[ -x "${ROOT_DIR}/venv/bin/python" ]]; then
  PYTHON_BIN="${ROOT_DIR}/venv/bin/python"
  if [[ -f "${ROOT_DIR}/venv/bin/activate" ]]; then
    # shellcheck source=/dev/null
    source "${ROOT_DIR}/venv/bin/activate"
  fi
elif [[ -x "${ROOT_DIR}/.venv/bin/python" ]]; then
  PYTHON_BIN="${ROOT_DIR}/.venv/bin/python"
  if [[ -f "${ROOT_DIR}/.venv/bin/activate" ]]; then
    # shellcheck source=/dev/null
    source "${ROOT_DIR}/.venv/bin/activate"
  fi
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
else
  echo -e "${CLR_RED}${CLR_BOLD}[ERROR]${CLR_RESET} No Python interpreter found! Please create a virtualenv at ${ROOT_DIR}/venv"
  exit 1
fi

echo -e "${CLR_BLUE}[ENV]${CLR_RESET} Python Binary:  ${CLR_BOLD}${PYTHON_BIN}${CLR_RESET}"

# ------------------------------------------------------------------------------
# 4. Load Environment Configuration Safely
# ------------------------------------------------------------------------------
if [[ -f "${ROOT_DIR}/.env" ]]; then
  echo -e "${CLR_BLUE}[ENV]${CLR_RESET} Loading config: ${CLR_DIM}${ROOT_DIR}/.env${CLR_RESET}"
  # Read .env safely without executing arbitrary shell tokens (like unquoted <>)
  while IFS='=' read -r key value || [ -n "$key" ]; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    key="$(echo "$key" | tr -d '[:space:]')"
    value="$(echo "$value" | sed -e 's/[[:space:]]*#.*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    if [[ -z "${!key:-}" && -n "$key" && "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
      export "$key"="$value"
    fi
  done < "${ROOT_DIR}/.env"
elif [[ -f "${ROOT_DIR}/backend/.env" ]]; then
  echo -e "${CLR_BLUE}[ENV]${CLR_RESET} Loading config: ${CLR_DIM}${ROOT_DIR}/backend/.env${CLR_RESET}"
  while IFS='=' read -r key value || [ -n "$key" ]; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    key="$(echo "$key" | tr -d '[:space:]')"
    value="$(echo "$value" | sed -e 's/[[:space:]]*#.*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    if [[ -z "${!key:-}" && -n "$key" && "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
      export "$key"="$value"
    fi
  done < "${ROOT_DIR}/backend/.env"
fi

# Set development overrides if requested
if [[ "${DEV_MODE}" -eq 1 ]]; then
  export NETRA_ENV="development"
  export LOG_LEVEL="DEBUG"
  echo -e "${CLR_YELLOW}[MODE]${CLR_RESET} Running in ${CLR_BOLD}DEVELOPMENT${CLR_RESET} mode (DEBUG logs enabled)"
else
  export NETRA_ENV="${NETRA_ENV:-production}"
  export LOG_LEVEL="${LOG_LEVEL:-INFO}"
  echo -e "${CLR_GREEN}[MODE]${CLR_RESET} Running in ${CLR_BOLD}${NETRA_ENV}${CLR_RESET} mode"
fi

if [[ -n "${CUSTOM_WORKER_ID}" ]]; then
  export NETRA_WORKER_ID="${CUSTOM_WORKER_ID}"
fi

# ------------------------------------------------------------------------------
# 5. AWS & Pipeline Configuration Checks
# ------------------------------------------------------------------------------
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export DYNAMO_TABLE_JOBS="${DYNAMO_TABLE_JOBS:-netra-jobs}"
export DYNAMO_TABLE_WORKERS="${DYNAMO_TABLE_WORKERS:-netra-workers}"
export S3_BUCKET_MEDIA="${S3_BUCKET_MEDIA:-netra-media-uploads}"
export SQS_QUEUE_URL="${SQS_QUEUE_URL:-https://sqs.${AWS_DEFAULT_REGION}.amazonaws.com/131746731374/netra-jobs}"

echo -e "${CLR_BLUE}[AWS]${CLR_RESET} Region:         ${CLR_CYAN}${AWS_DEFAULT_REGION}${CLR_RESET}"
echo -e "${CLR_BLUE}[AWS]${CLR_RESET} SQS Queue:      ${CLR_CYAN}${SQS_QUEUE_URL}${CLR_RESET}"
echo -e "${CLR_BLUE}[AWS]${CLR_RESET} DynamoDB Jobs:  ${CLR_CYAN}${DYNAMO_TABLE_JOBS}${CLR_RESET}"
echo -e "${CLR_BLUE}[AWS]${CLR_RESET} DynamoDB Fleet: ${CLR_CYAN}${DYNAMO_TABLE_WORKERS}${CLR_RESET}"
echo -e "${CLR_BLUE}[AWS]${CLR_RESET} S3 Media:       ${CLR_CYAN}${S3_BUCKET_MEDIA}${CLR_RESET}"

if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
  echo -e "${CLR_YELLOW}[AUTH]${CLR_RESET} AWS_ACCESS_KEY_ID is not set in environment (using IAM Role / Instance Profile / ~/.aws)"
else
  MASKED_KEY="${AWS_ACCESS_KEY_ID:0:4}...${AWS_ACCESS_KEY_ID: -4}"
  echo -e "${CLR_GREEN}[AUTH]${CLR_RESET} AWS Access Key: ${MASKED_KEY}"
fi

# ------------------------------------------------------------------------------
# 6. Hardware & Neural Accelerator Diagnostics
# ------------------------------------------------------------------------------
echo -e "\n${CLR_BOLD}Checking Neural Acceleration Hardware:${CLR_RESET}"
"${PYTHON_BIN}" -c "
import sys
try:
    import torch
    cuda_avail = torch.cuda.is_available()
    mps_avail = hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()
    
    if cuda_avail:
        device_name = torch.cuda.get_device_name(0)
        device_count = torch.cuda.device_count()
        print(f'  \033[32m✔ CUDA Accelerated:\033[0m {device_count}x {device_name} (PyTorch {torch.__version__})')
    elif mps_avail:
        print(f'  \033[32m✔ Apple Silicon MPS:\033[0m Metal Performance Shaders Active (PyTorch {torch.__version__})')
    else:
        print(f'  \033[33m⚡ CPU Fallback Mode:\033[0m PyTorch {torch.__version__} (No CUDA/MPS GPU detected)')
except ImportError:
    print('  \033[31m✘ PyTorch not installed in this environment!\033[0m')
    sys.exit(1)

try:
    import boto3
    print(f'  \033[32m✔ AWS SDK (boto3):\033[0m Version {boto3.__version__}')
except ImportError:
    print('  \033[31m✘ boto3 not installed in this environment!\033[0m')
    sys.exit(1)
"

# Set PYTHONPATH to include root and backend for clean module resolution
export PYTHONPATH="${ROOT_DIR}:${ROOT_DIR}/backend:${PYTHONPATH:-}"

if [[ "${CHECK_ONLY}" -eq 1 ]]; then
  echo -e "\n${CLR_GREEN}${CLR_BOLD}[SUCCESS] Pre-flight environment check passed cleanly.${CLR_RESET}"
  exit 0
fi

# ------------------------------------------------------------------------------
# 7. Signal Handling & Graceful Process Supervision
# ------------------------------------------------------------------------------
WORKER_PID=0

cleanup() {
  local exit_sig="$1"
  echo ""
  echo -e "${CLR_YELLOW}${CLR_BOLD}[SIGNAL] Caught ${exit_sig}. Gracefully shutting down worker process (PID ${WORKER_PID})...${CLR_RESET}"
  if [[ "${WORKER_PID}" -ne 0 ]]; then
    # Send SIGTERM to allow worker loop to release SQS visibility & update worker table to draining/offline
    kill -TERM "${WORKER_PID}" 2>/dev/null || true
    
    # Wait up to 15 seconds for graceful exit
    local count=0
    while kill -0 "${WORKER_PID}" 2>/dev/null && [[ $count -lt 15 ]]; do
      sleep 1
      count=$((count + 1))
    done
    
    if kill -0 "${WORKER_PID}" 2>/dev/null; then
      echo -e "${CLR_RED}[WARN] Worker did not terminate within 15s. Sending SIGKILL.${CLR_RESET}"
      kill -KILL "${WORKER_PID}" 2>/dev/null || true
    fi
  fi
  echo -e "${CLR_GREEN}[SHUTDOWN] NETRA worker daemon stopped cleanly.${CLR_RESET}"
  exit 0
}

trap 'cleanup SIGINT' SIGINT
trap 'cleanup SIGTERM' SIGTERM

# ------------------------------------------------------------------------------
# 8. Launch Autonomous SQS Worker Daemon
# ------------------------------------------------------------------------------
echo -e "\n${CLR_GREEN}${CLR_BOLD}[START] Launching python -m worker.worker...${CLR_RESET}\n"

# Run python worker as child process to preserve trap handling
"${PYTHON_BIN}" -m worker.worker "$@" &
WORKER_PID=$!

# Wait for worker process to finish
wait "${WORKER_PID}"
EXIT_CODE=$?

echo -e "\n${CLR_BLUE}[EXIT] Worker process finished with code ${EXIT_CODE}.${CLR_RESET}"
exit "${EXIT_CODE}"
