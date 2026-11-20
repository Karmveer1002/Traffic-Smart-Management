"""Flask server. The browser sends the current traffic state; Python does the graph work."""
import random
import time

from flask import Flask, jsonify, render_template, request

import algorithms as algo
from graph import HOSPITAL, NODES, ROADS, Graph

app = Flask(__name__)


def graph_from(data, mode=None):
    return Graph(traffic=data.get("traffic"), closed=data.get("closed", []),
                 mode=mode or data.get("mode", "time"))


def average_ms(fn, runs=1):
    start = time.perf_counter()
    for _ in range(runs):
        result = fn()
    return result, (time.perf_counter() - start) * 1000 / runs


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/network")
def network():
    return jsonify(nodes=[{"name": n, "x": x, "y": y} for n, x, y in NODES],
                   roads=[{"a": a, "b": b, "km": km} for a, b, km in ROADS],
                   hospital=HOSPITAL)


@app.post("/api/route")
def route():
    data = request.get_json()
    graph = graph_from(data)
    result = algo.ALGORITHMS[data["alg"]](graph, data["src"], data["dst"])
    free_flow = Graph(mode=graph.mode)  # same trip with no traffic and no closures
    result["free_flow"] = algo.dijkstra(free_flow, data["src"], data["dst"])["cost"]
    return jsonify(result)


@app.post("/api/compare")
def compare():
    data = request.get_json()
    graph = graph_from(data)
    best = algo.dijkstra(graph, data["src"], data["dst"])["cost"]
    rows = []
    for name, fn in algo.ROUTING.items():
        result, ms = average_ms(lambda: fn(graph, data["src"], data["dst"]), runs=200)
        rows.append({"name": name, "cost": result["cost"], "explored": len(result["order"]),
                     "ms": round(ms, 4), "optimal": result["cost"] is not None
                     and abs(result["cost"] - best) < 1e-9})
    return jsonify(rows)


@app.post("/api/ambulance")
def ambulance():
    """Ambulance ignores traffic (signals cleared) but still cannot use closed roads."""
    data = request.get_json()
    fast = algo.dijkstra(graph_from(data, "dist"), data["src"], HOSPITAL)
    normal = algo.dijkstra(graph_from(data, "time"), data["src"], HOSPITAL)
    saved = None if fast["cost"] is None else max(0, normal["cost"] - fast["cost"])
    return jsonify(path=fast["path"], minutes=fast["cost"], saved=saved)


@app.get("/api/benchmark")
def benchmark():
    """Time each algorithm on random grid cities of growing size."""
    rows = []
    for k in (10, 20, 32, 45):
        rng = random.Random(7)
        nodes = [("", x * 10, y * 10) for y in range(k) for x in range(k)]
        roads = []
        for y in range(k):
            for x in range(k):
                i = y * k + x
                for j in ([i + 1] if x < k - 1 else []) + ([i + k] if y < k - 1 else []):
                    km = 10 * (1 + rng.random())
                    roads.append((i, j, km))
        graph, last = Graph(nodes, roads), len(nodes) - 1
        timings = {name: round(average_ms(lambda f=f: f(graph, 0, last))[1], 2)
                   for name, f in {**algo.ROUTING, "Kruskal": algo.kruskal, "Prim": algo.prim}.items()}
        rows.append({"junctions": len(nodes), "roads": len(roads), **timings})
    return jsonify(rows)


if __name__ == "__main__":
    app.run(debug=True)
