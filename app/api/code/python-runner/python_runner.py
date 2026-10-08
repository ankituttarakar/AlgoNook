import json
import ast
import os
import selectors
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

PER_TEST_TIMEOUT_SECONDS = 2.0
MAX_STREAM_BYTES_PER_TEST = 4096
MAX_TOTAL_OUTPUT_BYTES = 128 * 1024
RESULT_FRAME = "__ALGONOOK_RUNNER_RESULT__"
FUNCTION_RESULT_FRAME = "__ALGONOOK_FUNCTION_RESULT__"
MAX_TRACE_STEPS = 40
MAX_TRACE_EVENT_BYTES = 4096

# Explicit server-owned function contracts. Submitted code can only implement
# one named function with these argument and return shapes.
CHAPTER_PROBLEMS = {
    "max-profit": ("maxProfit", ["prices"], "json"),
    "binary-search-first": ("lowerBound", ["nums", "target"], "json"),
    "window-max-sum": ("maxWindowSum", ["nums", "k"], "json"),
    "valid-parentheses": ("isValidBrackets", ["s"], "bool"),
    "reverse-linked-values": ("reverseValues", ["values"], "integer-list"),
    "tree-max-depth": ("maxDepth", ["level"], "json"),
    "kth-largest": ("kthLargest", ["values", "k"], "json"),
    "reachable-nodes": ("reachableCount", ["graph", "start"], "json"),
    "subsets": ("subsets", ["nums"], "unordered-integer-subsets"),
    "climb-stairs": ("climbStairs", ["n"], "json"),
}

def is_integer_list(value):
    return isinstance(value, list) and len(value) <= 10000 and all(type(item) is int for item in value)

def valid_chapter_case(problem_id, case):
    expected = case.get("expected")
    if problem_id in ("max-profit", "binary-search-first", "window-max-sum", "kth-largest", "climb-stairs", "reachable-nodes", "tree-max-depth"):
        if type(expected) is not int:
            return False
    if problem_id in ("max-profit", "window-max-sum"):
        values = case.get("prices" if problem_id == "max-profit" else "nums")
        if not is_integer_list(values) or not values:
            return False
        return problem_id == "max-profit" or (type(case.get("k")) is int and 1 <= case["k"] <= len(values))
    if problem_id == "binary-search-first":
        nums = case.get("nums")
        return is_integer_list(nums) and all(nums[i] <= nums[i + 1] for i in range(len(nums) - 1)) and type(case.get("target")) is int and 0 <= expected <= len(nums)
    if problem_id == "valid-parentheses":
        return isinstance(case.get("s"), str) and len(case["s"]) <= 10000 and all(char in "()[]{}" for char in case["s"]) and type(expected) is bool
    if problem_id == "reverse-linked-values":
        return is_integer_list(case.get("values")) and is_integer_list(expected)
    if problem_id == "tree-max-depth":
        level = case.get("level")
        return isinstance(level, list) and len(level) <= 10000 and all(value is None or type(value) is int for value in level) and (not level or level[0] is not None)
    if problem_id == "kth-largest":
        values = case.get("values")
        return is_integer_list(values) and type(case.get("k")) is int and 1 <= case["k"] <= len(values)
    if problem_id == "reachable-nodes":
        graph = case.get("graph")
        return isinstance(graph, list) and 0 < len(graph) <= 10000 and all(is_integer_list(neighbors) and all(0 <= node < len(graph) for node in neighbors) for neighbors in graph) and type(case.get("start")) is int and 0 <= case["start"] < len(graph)
    if problem_id == "subsets":
        return is_integer_list(case.get("nums")) and len(case["nums"]) <= 10 and isinstance(expected, list) and all(is_integer_list(item) for item in expected)
    if problem_id == "climb-stairs":
        return type(case.get("n")) is int and 1 <= case["n"] <= 45
    return False

def equivalent_result(problem_id, actual, expected):
    if problem_id == "subsets" and isinstance(actual, list) and isinstance(expected, list):
        try:
            return sorted(tuple(sorted(item)) for item in actual) == sorted(tuple(sorted(item)) for item in expected)
        except (TypeError, ValueError):
            return False
    return actual == expected

FUNCTION_HARNESS = r'''import json, sys

class AlgoNookTrace:
    allowed_actions = {"visit", "compare", "move-left", "move-right", "found", "not-found", "duplicate", "complete"}

    def __init__(self, enabled):
        self.enabled = enabled
        self.events = []

    def _clean(self, value, depth=0):
        if depth > 4:
            return None
        if value is None or type(value) in (bool, int):
            return value
        if isinstance(value, float):
            return value if value == value and abs(value) != float("inf") else None
        if isinstance(value, str):
            return value[:120]
        if isinstance(value, (list, tuple)):
            return [self._clean(item, depth + 1) for item in value[:64]]
        if isinstance(value, dict):
            return {str(key)[:64]: self._clean(item, depth + 1) for key, item in list(value.items())[:24]}
        return None

    def step(self, action, state, metadata=None):
        if not self.enabled or len(self.events) >= 40 or not isinstance(action, str) or action not in self.allowed_actions or not isinstance(state, dict):
            return
        event = {"step": len(self.events) + 1, "action": action, "state": self._clean(state)}
        if isinstance(metadata, dict):
            event["metadata"] = self._clean(metadata)
        try:
            if len(json.dumps(event, separators=(",", ":"), allow_nan=False).encode("utf-8")) > 4096:
                return
        except (TypeError, ValueError):
            return
        self.events.append(event)

    def snapshot(self):
        safe = []
        for event in self.events[:40]:
            if not isinstance(event, dict) or not isinstance(event.get("action"), str) or event.get("action") not in self.allowed_actions or not isinstance(event.get("state"), dict):
                continue
            cleaned = {"step": len(safe) + 1, "action": event["action"], "state": self._clean(event["state"])}
            if isinstance(event.get("metadata"), dict):
                cleaned["metadata"] = self._clean(event["metadata"])
            try:
                if len(json.dumps(cleaned, separators=(",", ":"), allow_nan=False).encode("utf-8")) <= 4096:
                    safe.append(cleaned)
            except (TypeError, ValueError):
                continue
        return safe

def invoke(source_path):
    trusted_stdout = sys.stdout
    try:
        payload = json.loads(sys.stdin.readline())
        arguments_list = payload.get("arguments", [payload.get("argument")])
        with open(source_path, "r", encoding="utf-8") as source_file:
            source = source_file.read()
        trace = AlgoNookTrace(len(sys.argv) > 3 and sys.argv[3] == "1")
        submission_globals = {"__name__": "__submission__", "algonook": trace}
        exec(compile(source, "<submission>", "exec"), submission_globals, submission_globals)
        function = submission_globals.get(sys.argv[2])
        if not callable(function):
            raise TypeError("required function is not defined")
        actual = function(*arguments_list)
        result = {"actual": actual, "trace": trace.snapshot()}
    except BaseException as error:
        result = {"error": type(error).__name__[:64]}
    trusted_stdout.write("__ALGONOOK_FUNCTION_RESULT__" + json.dumps(result, separators=(",", ":")) + "\n")
    trusted_stdout.flush()

invoke(sys.argv[1])
'''


def emit(result):
    sys.stdout.write(RESULT_FRAME + json.dumps(result, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def test_id(test_case, index):
    return test_case.get("id") or f"test-{index + 1}"


def not_run_cases(test_cases):
    return [
        {"id": test_id(case, index), "status": "NOT_RUN"}
        for index, case in enumerate(test_cases)
    ]


def emit_problem_result(status, test_cases, results, passed, started_at, error=None, trace=None):
    result = {
        "status": status,
        "summary": {"passed": passed, "total": len(test_cases)},
        "tests": results,
        "stdout": "",
        "stderr": "",
        "executionTimeMs": int((time.monotonic() - started_at) * 1000),
    }
    if error:
        result["error"] = error
    if trace is not None:
        result["trace"] = trace
    emit(result)


def execute_function_problem(source, test_cases, function_name="containsDuplicate", argument_key="nums", result_type="bool", argument_keys=None, trace_enabled=False, problem_id=None):
    argument_keys = argument_keys or [argument_key]
    started_at = time.monotonic()
    try:
        tree = ast.parse(source, filename="<submission>")
        top_level = [node for node in tree.body if not (
            isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str)
        )]
        if len(top_level) != 1 or not isinstance(top_level[0], ast.FunctionDef) or top_level[0].name != function_name:
            raise ValueError(f"Define only the {function_name} function.")
        function_node = top_level[0]
        if function_node.decorator_list or len(function_node.args.posonlyargs) + len(function_node.args.args) != len(argument_keys) or function_node.args.vararg or function_node.args.kwarg or function_node.args.kwonlyargs:
            raise ValueError(f"{function_name} must accept exactly {len(argument_keys)} positional argument(s).")
        compile(tree, "<submission>", "exec")
    except SyntaxError as error:
        emit({
            "status": "COMPILE_ERROR",
            "summary": {"passed": 0, "total": len(test_cases)},
            "tests": not_run_cases(test_cases),
            "stdout": "",
            "stderr": "",
            "executionTimeMs": int((time.monotonic() - started_at) * 1000),
            "error": {"code": "PYTHON_SYNTAX_ERROR", "message": f"Syntax error on line {error.lineno or 1}."},
        })
        return
    except ValueError as error:
        emit({
            "status": "COMPILE_ERROR",
            "summary": {"passed": 0, "total": len(test_cases)},
            "tests": not_run_cases(test_cases),
            "stdout": "",
            "stderr": "",
            "executionTimeMs": int((time.monotonic() - started_at) * 1000),
            "error": {"code": "INVALID_FUNCTION_SIGNATURE", "message": str(error)},
        })
        return

    with tempfile.TemporaryDirectory(prefix="algonook-") as temp_dir:
        source_path = Path(temp_dir) / "submission.py"
        source_path.write_text(source, encoding="utf-8")
        source_path.chmod(0o600)
        results = []
        passed = 0
        overall_status = "PASSED"
        trace_steps = []

        for index, case in enumerate(test_cases):
            try:
                process = subprocess.Popen(
                    [sys.executable, "-I", "-S", "-B", "-c", FUNCTION_HARNESS, str(source_path), function_name, "1" if trace_enabled else "0"],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    start_new_session=True,
                    cwd=temp_dir,
                )
                arguments = [case[key] for key in argument_keys]
                outcome = read_process(process, json.dumps({"arguments": arguments}, separators=(",", ":")) + "\n")
            except OSError:
                results.append({"id": test_id(case, index), "status": "RUNTIME_ERROR", "error": {"code": "PROCESS_START_FAILED", "message": "The test process could not start."}})
                overall_status = "RUNTIME_ERROR"
                continue

            result = {"id": test_id(case, index), "durationMs": outcome["durationMs"]}
            if outcome["timedOut"]:
                result.update({"status": "TIME_LIMIT_EXCEEDED", "error": {"code": "PYTHON_TIMEOUT", "message": "Test exceeded the 2 second time limit."}})
            elif outcome["outputLimited"]:
                result.update({"status": "OUTPUT_LIMIT_EXCEEDED", "error": {"code": "OUTPUT_LIMIT", "message": "Program output exceeded the allowed limit."}})
            elif outcome["returnCode"] == -signal.SIGKILL:
                result.update({"status": "MEMORY_LIMIT_EXCEEDED", "error": {"code": "MEMORY_LIMIT", "message": "The process exceeded the sandbox memory limit."}})
            else:
                frame_index = outcome["stdout"].rfind(FUNCTION_RESULT_FRAME)
                try:
                    if frame_index < 0:
                        raise ValueError("missing result frame")
                    frame = outcome["stdout"][frame_index + len(FUNCTION_RESULT_FRAME):].splitlines()[0]
                    function_result = json.loads(frame)
                except (ValueError, json.JSONDecodeError, IndexError):
                    function_result = {"error": "NoResult"}

                if "error" in function_result or outcome["returnCode"] != 0:
                    result.update({"status": "RUNTIME_ERROR", "error": {"code": "PYTHON_RUNTIME_ERROR", "message": "The function raised an error or returned an invalid result."}})
                elif result_type == "bool" and type(function_result.get("actual")) is not bool:
                    result.update({"status": "RUNTIME_ERROR", "error": {"code": "INVALID_RETURN_TYPE", "message": f"{function_name} must return a boolean."}})
                elif result_type == "frequency-map" and (
                    not isinstance(function_result.get("actual"), dict)
                    or any(not isinstance(key, str) or type(count) is not int or count < 1 for key, count in function_result["actual"].items())
                ):
                    result.update({"status": "RUNTIME_ERROR", "error": {"code": "INVALID_RETURN_TYPE", "message": f"{function_name} must return a map of string keys to positive integer counts."}})
                elif result_type == "index-pair" and (
                    not isinstance(function_result.get("actual"), list)
                    or any(type(index) is not int for index in function_result["actual"])
                ):
                    result.update({"status": "RUNTIME_ERROR", "error": {"code": "INVALID_RETURN_TYPE", "message": f"{function_name} must return a list of integer indices."}})
                elif result_type == "integer-list" and not is_integer_list(function_result.get("actual")):
                    result.update({"status": "RUNTIME_ERROR", "error": {"code": "INVALID_RETURN_TYPE", "message": f"{function_name} must return a list of integers."}})
                elif result_type == "unordered-integer-subsets" and (
                    not isinstance(function_result.get("actual"), list)
                    or not all(is_integer_list(item) for item in function_result["actual"])
                ):
                    result.update({"status": "RUNTIME_ERROR", "error": {"code": "INVALID_RETURN_TYPE", "message": f"{function_name} must return a list of integer lists."}})
                elif equivalent_result(problem_id, function_result["actual"], case["expected"]):
                    result.update({"status": "PASSED", "actual": function_result["actual"]})
                    passed += 1
                else:
                    result.update({"status": "WRONG_ANSWER", "actual": function_result["actual"]})

                if trace_enabled and index == 0 and isinstance(function_result.get("trace"), list):
                    trace_steps = function_result["trace"][:MAX_TRACE_STEPS]

            if result["status"] != "PASSED" and overall_status == "PASSED":
                overall_status = result["status"]
            results.append(result)

    emit_problem_result(overall_status, test_cases, results, passed, started_at, trace=trace_steps if trace_enabled else None)


def kill_process_group(process):
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        try:
            process.kill()
        except ProcessLookupError:
            pass


def read_process(process, input_text):
    process.stdin.write(input_text.encode("utf-8"))
    process.stdin.close()
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ, "stdout")
    selector.register(process.stderr, selectors.EVENT_READ, "stderr")
    captured = {"stdout": bytearray(), "stderr": bytearray()}
    started_at = time.monotonic()
    timed_out = False
    output_limited = False

    while selector.get_map():
        remaining = PER_TEST_TIMEOUT_SECONDS - (time.monotonic() - started_at)
        if remaining <= 0:
            timed_out = True
            kill_process_group(process)
            break

        events = selector.select(min(remaining, 0.1))
        for key, _ in events:
            chunk = os.read(key.fileobj.fileno(), 4096)
            if not chunk:
                selector.unregister(key.fileobj)
                key.fileobj.close()
                continue
            stream = key.data
            available = MAX_STREAM_BYTES_PER_TEST - len(captured[stream])
            captured[stream].extend(chunk[:max(0, available)])
            if len(chunk) > available:
                output_limited = True
                kill_process_group(process)
                break
        if timed_out or output_limited:
            break

    if timed_out or output_limited:
        selector.close()
        for stream in (process.stdout, process.stderr):
            if not stream.closed:
                stream.close()
    else:
        selector.close()

    try:
        return_code = process.wait(timeout=0.5)
    except subprocess.TimeoutExpired:
        kill_process_group(process)
        return_code = process.wait()

    return {
        "returnCode": return_code,
        "timedOut": timed_out,
        "outputLimited": output_limited,
        "stdout": captured["stdout"].decode("utf-8", errors="replace"),
        "stderr": captured["stderr"].decode("utf-8", errors="replace"),
        "durationMs": int((time.monotonic() - started_at) * 1000),
    }


def main():
    problem_id = None
    try:
        request = json.load(sys.stdin)
        if not isinstance(request, dict):
            raise ValueError("invalid runner request")
        source = request["sourceCode"]
        test_cases = request["testCases"]
        trace_enabled = request.get("trace", False)
        if type(trace_enabled) is not bool:
            raise ValueError("invalid trace setting")
        if not isinstance(source, str) or not isinstance(test_cases, list):
            raise ValueError("invalid runner request")
        problem_id = request.get("problemId")
        if problem_id is not None:
            if problem_id not in ("contains-duplicate", "frequency-map", "two-sum-sorted", *CHAPTER_PROBLEMS.keys()) or not test_cases or len(test_cases) > 20:
                raise ValueError("invalid problem runner request")
            for case in test_cases:
                if not isinstance(case, dict) or ("id" in case and not isinstance(case["id"], str)):
                    raise ValueError("invalid trusted problem test")
                if problem_id == "contains-duplicate":
                    values = case.get("nums")
                    valid = isinstance(values, list) and len(values) <= 10000 and all(type(value) is int for value in values) and type(case.get("expected")) is bool
                elif problem_id == "frequency-map":
                    values = case.get("values")
                    expected = case.get("expected")
                    valid = (
                        isinstance(values, list) and len(values) <= 10000 and all(isinstance(value, str) and len(value) <= 256 for value in values)
                        and isinstance(expected, dict) and all(isinstance(key, str) and type(count) is int and count > 0 for key, count in expected.items())
                    )
                else:
                    if problem_id == "two-sum-sorted":
                        values = case.get("nums")
                        target = case.get("target")
                        expected = case.get("expected")
                        valid = (
                            isinstance(values, list) and 2 <= len(values) <= 10000
                            and all(type(value) is int for value in values)
                            and all(values[i] <= values[i + 1] for i in range(len(values) - 1))
                            and type(target) is int and isinstance(expected, list)
                            and (expected == [] or (len(expected) == 2 and all(type(index) is int for index in expected)))
                        )
                    else:
                        valid = valid_chapter_case(problem_id, case)
                if not valid:
                    raise ValueError("invalid trusted problem test")
        else:
            for case in test_cases:
                if not isinstance(case, dict) or not isinstance(case.get("input"), str) or not isinstance(case.get("expected"), str):
                    raise ValueError("invalid stdin/stdout test case")
            compile(source, "<submission>", "exec")
    except SyntaxError as error:
        diagnostic = f"SyntaxError: {error.msg} (line {error.lineno or 1})"
        emit({
            "status": "COMPILE_ERROR",
            "summary": {"passed": 0, "total": len(locals().get("test_cases", []))},
            "tests": not_run_cases(locals().get("test_cases", [])),
            "stdout": "",
            "stderr": "",
            "error": {"code": "PYTHON_SYNTAX_ERROR", "message": diagnostic},
        })
        return
    except Exception:
        emit({
            "status": "SANDBOX_ERROR",
            "summary": {"passed": 0, "total": 0},
            "tests": [],
            "stdout": "",
            "stderr": "",
            "error": {"code": "INVALID_RUNNER_REQUEST", "message": "The sandbox received an invalid execution request."},
        })
        return

    if problem_id == "contains-duplicate":
        execute_function_problem(source, test_cases, trace_enabled=trace_enabled)
        return
    if problem_id == "frequency-map":
        execute_function_problem(source, test_cases, "countFrequencies", "values", "frequency-map", trace_enabled=trace_enabled)
        return
    if problem_id == "two-sum-sorted":
        execute_function_problem(source, test_cases, "twoSumSorted", result_type="index-pair", argument_keys=["nums", "target"], trace_enabled=trace_enabled)
        return
    if problem_id in CHAPTER_PROBLEMS:
        function_name, argument_keys, result_type = CHAPTER_PROBLEMS[problem_id]
        execute_function_problem(source, test_cases, function_name, result_type=result_type, argument_keys=argument_keys, trace_enabled=trace_enabled, problem_id=problem_id)
        return

    with tempfile.TemporaryDirectory(prefix="algonook-", dir="/tmp") as temp_dir:
        source_path = Path(temp_dir) / "submission.py"
        source_path.write_text(source, encoding="utf-8")
        source_path.chmod(0o600)
        results = []
        total_stdout = []
        total_stderr = []
        passed = 0
        total_output_bytes = 0
        overall_status = "PASSED"
        started_at = time.monotonic()

        for index, case in enumerate(test_cases):
            process = None
            try:
                process = subprocess.Popen(
                    [sys.executable, "-I", "-S", "-B", str(source_path)],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    start_new_session=True,
                    cwd=temp_dir,
                )
                outcome = read_process(process, case["input"])
            except OSError:
                if process is not None:
                    kill_process_group(process)
                    process.wait()
                results.append({"id": test_id(case, index), "status": "RUNTIME_ERROR"})
                overall_status = "RUNTIME_ERROR"
                continue

            stdout = outcome["stdout"]
            stderr = outcome["stderr"].replace(str(source_path), "<submission>")
            total_output_bytes += len(stdout.encode("utf-8")) + len(stderr.encode("utf-8"))
            total_stdout.append(stdout)
            total_stderr.append(stderr)

            if outcome["timedOut"]:
                status = "TIME_LIMIT_EXCEEDED"
                error = {"code": "PYTHON_TIMEOUT", "message": "Test exceeded the 2 second time limit."}
            elif outcome["outputLimited"] or total_output_bytes > MAX_TOTAL_OUTPUT_BYTES:
                status = "OUTPUT_LIMIT_EXCEEDED"
                error = {"code": "OUTPUT_LIMIT", "message": "Program output exceeded the allowed limit."}
            elif outcome["returnCode"] == -signal.SIGKILL:
                status = "MEMORY_LIMIT_EXCEEDED"
                error = {"code": "MEMORY_LIMIT", "message": "The process exceeded the sandbox memory limit."}
            elif outcome["returnCode"] != 0:
                status = "RUNTIME_ERROR"
                lines = [line for line in stderr.splitlines() if line.strip()]
                diagnostic = lines[-1][:512] if lines else "The program exited with a non-zero status."
                error = {"code": "PYTHON_RUNTIME_ERROR", "message": diagnostic}
            elif stdout != case["expected"]:
                status = "WRONG_ANSWER"
                error = None
            else:
                status = "PASSED"
                error = None
                passed += 1

            result = {
                "id": test_id(case, index),
                "status": status,
                "expected": case["expected"],
                "actual": stdout,
                "stdout": stdout,
                "stderr": stderr,
                "durationMs": outcome["durationMs"],
            }
            if error:
                result["error"] = error
            results.append(result)

            if status != "PASSED" and overall_status == "PASSED":
                overall_status = status
            if status == "OUTPUT_LIMIT_EXCEEDED" and total_output_bytes > MAX_TOTAL_OUTPUT_BYTES:
                results.extend(not_run_cases(test_cases[index + 1:]))
                break

        emit({
            "status": overall_status,
            "summary": {"passed": passed, "total": len(test_cases)},
            "tests": results,
            "stdout": "".join(total_stdout)[:MAX_TOTAL_OUTPUT_BYTES],
            "stderr": "".join(total_stderr)[:MAX_TOTAL_OUTPUT_BYTES],
            "executionTimeMs": int((time.monotonic() - started_at) * 1000),
        })


if __name__ == "__main__":
    main()
