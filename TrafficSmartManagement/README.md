# Smart City Traffic Management and Route Optimization

Python (Flask) runs the graph algorithms. The browser draws the animated map.

## Run on localhost
    python -m venv venv
    venv\Scripts\activate          # Windows   (macOS/Linux: source venv/bin/activate)
    pip install -r requirements.txt
    python app.py
Open http://127.0.0.1:5000

## Project layout
    app.py            Flask routes (API + page)
    graph.py          road data and the Graph class
    algorithms.py     Dijkstra, A*, Bellman-Ford, BFS, DFS, Kruskal, Prim
    templates/index.html
    static/css/style.css
    static/js/        api.js (fetch helper), map.js (canvas), main.js (UI logic)
