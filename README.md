<div align="center">

# 🌃 Smart City Traffic Control & Route Optimization
### Real-Time Graph Pathfinding, Traffic Simulation & Emergency Dispatch Studio

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Canvas-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

*A full-stack smart city traffic control room that models junctions and roads as a dynamic weighted graph—running Dijkstra, A\*, Bellman-Ford, BFS, DFS, Kruskal, and Prim in Python while animating live traffic and route exploration on an interactive HTML5 Canvas.*

**Developed by:** Karmveer Singh Gehlot 

</div>

---

## 📌 Overview & Problem Statement

Urban traffic networks are constantly shifting due to rush-hour congestion, accidents, and sudden road closures. Static shortest-distance routing fails in real-world cities because the physically shortest road may be heavily gridlocked.

**NightGrid** solves this by modeling a 15-junction, 25-road city network as a dynamic weighted graph (`graph.py`). Users can interactively close roads, trigger rush-hour congestion, dispatch an emergency ambulance from the **Hospital**, and compare how 7 different graph algorithms explore the network in real time.

---

## ✨ Key Features

* **🗺️ Live Animated City Map (`map.js`):** Interactive 800×520 HTML5 Canvas rendering 15 named city hubs (*Central, Airport, University, Harbor, Tech Park, Hospital*, etc.) with live moving vehicles color-coded by traffic density.
* **⚡ 7 Graph Algorithms From Scratch (`algorithms.py`):**
  * **Shortest Path:** Dijkstra's Algorithm (`heapq`), A\* Search (Euclidean heuristic), and Bellman-Ford.
  * **Traversal:** Breadth-First Search (BFS) and Depth-First Search (DFS).
  * **Minimum Spanning Tree (MST):** Kruskal's and Prim's algorithms for optimal city infrastructure coverage.
* **⏱️ Dual Routing Modes (`Time` vs. `Distance`):** Dynamically computes travel time (`km × (1 + traffic)`) vs. physical distance (`km`) and compares active travel time against free-flow baseline time.
* **🚧 Interactive Control Room (`main.js`):** Click any junction to set origin/destination, click any road to close/reopen it, trigger rush hour, monitor the **City Health Gauge**, or dispatch an ambulance from the Hospital.
* **📊 Real-Time Algorithm Benchmark (`/api/compare`):** Evaluates path cost, explored nodes, and runtime (`ms`) across algorithms on the current traffic state.

---

## 🔄 System Architecture & Process Flowchart

```mermaid
flowchart TD
    A["🖱️ Control Room UI (index.html & main.js)<br/>Select Origin/Destination, Algorithm, Mode, Road Closures & Traffic"] --> B["📡 Async JSON Client (api.js)<br/>POST /api/route or /api/compare"]
    B --> C["⚙️ Flask REST Server (app.py)<br/>Parses traffic array, closed roads & routing mode"]
    C --> D["🕸️ Dynamic Weighted Graph (graph.py)<br/>Builds adjacency list excluding closed roads<br/>Applies cost = km × (1 + traffic) in Time mode"]
    D --> E{"🧠 Graph Engine (algorithms.py)"}

    E -->|"Shortest Path"| F1["Dijkstra / A* Search / Bellman-Ford"]
    E -->|"Graph Traversal"| F2["BFS / DFS"]
    E -->|"Spanning Tree"| F3["Kruskal / Prim MST"]

    F1 & F2 & F3 --> G["📦 JSON Response<br/>Optimal Path, Exploration Order, Cost & Free-Flow Baseline"]
    G --> H["🗺️ HTML5 Canvas Renderer (map.js)<br/>Animates node exploration wave, optimal route & live cars"]
