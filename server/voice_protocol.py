"""Marcos binarios acotados por stdin/stdout; sin sockets ni archivos de audio."""
import struct
import sys


def read_request(limit):
    header = sys.stdin.buffer.read(4)
    if not header:
        return None
    if len(header) != 4:
        raise EOFError("INVALID_FRAME")
    size = struct.unpack(">I", header)[0]
    if not 0 < size <= limit:
        raise ValueError("INVALID_FRAME")
    data = sys.stdin.buffer.read(size)
    if len(data) != size:
        raise EOFError("INVALID_FRAME")
    return data


def write_response(data, ok=True):
    sys.stdout.buffer.write(struct.pack(">BI", 0 if ok else 1, len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()
