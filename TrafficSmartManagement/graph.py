"""City road network data and the Graph class used by every algorithm."""
import math

# (name, x, y) positions are map pixels used for drawing and for the A* heuristic.
NODES = [("Central", 400, 250), ("Airport", 740, 60), ("University", 120, 70),
         ("Harbor", 90, 430), ("Tech Park", 690, 420), ("Old Town", 260, 190),
         ("Market", 520, 160), ("Stadium", 590, 320), ("Hospital", 320, 360),
         ("Rail Station", 430, 80), ("Mall", 650, 230), ("Port", 230, 480),
         ("Lakeside", 150, 250), ("Industrial", 430, 450), ("Hills", 290, 60)]

# (junction a, junction b, length in km)
ROADS = [(0, 5, 4), (0, 6, 5), (0, 8, 5), (0, 7, 6), (0, 9, 6), (5, 12, 4),
         (5, 2, 7), (5, 14, 5), (14, 2, 6), (14, 9, 5), (9, 6, 4), (9, 1, 9),
         (6, 10, 4), (10, 1, 7), (10, 7, 3), (7, 4, 5), (8, 13, 4), (8, 11, 5),
         (11, 3, 7), (12, 3, 7), (12, 8, 6), (13, 4, 8), (13, 7, 6), (2, 12, 6),
         (11, 13, 5)]

HOSPITAL = 8


class Graph:
    """Weighted undirected graph. Closed roads are left out of the adjacency list.

    traffic[i] is a congestion level for road i (0 = free flow, 2 = jammed).
    In "time" mode a road costs km * (1 + traffic); in "dist" mode it costs km.
    """

    def __init__(self, nodes=NODES, roads=ROADS, traffic=None, closed=(), mode="time"):
        self.nodes, self.roads, self.mode = nodes, roads, mode
        self.traffic = traffic or [0] * len(roads)
        self.closed = set(closed)
        self.adj = [[] for _ in nodes]  # adj[u] = [(v, cost, road_index), ...]
        for i, (a, b, _) in enumerate(roads):
            if i not in self.closed:
                self.adj[a].append((b, self.cost(i), i))
                self.adj[b].append((a, self.cost(i), i))

    def cost(self, road):
        km = self.roads[road][2]
        return km * (1 + self.traffic[road]) if self.mode == "time" else km

    def pixel_distance(self, a, b):
        return math.hypot(self.nodes[a][1] - self.nodes[b][1],
                          self.nodes[a][2] - self.nodes[b][2])

    def open_roads(self):
        return [i for i in range(len(self.roads)) if i not in self.closed]

    def path_cost(self, path):
        """Total cost of a node path (used for BFS and DFS routes)."""
        return sum(min(w for v, w, _ in self.adj[u] if v == nxt)
                   for u, nxt in zip(path, path[1:]))
