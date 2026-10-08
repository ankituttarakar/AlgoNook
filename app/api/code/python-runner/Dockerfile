FROM python:3.12.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /runner
COPY python_runner.py /runner/python_runner.py

USER 65532:65532
ENTRYPOINT ["python3", "-I", "-S", "-B", "/runner/python_runner.py"]
