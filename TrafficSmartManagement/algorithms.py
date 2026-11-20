"""Graph algorithms: shortest path, traversal and minimum spanning tree.

Every function takes (graph, src, dst) and returns a dict with:
  path  - junctions on the route (empty when there is none)
  order - junctions in the order the algorithm explored them
  cost  - route cost, or MST cost (None when unreachable)
  mst   - road indexes (MST algorithms only)
"""
import heapq
from collections import deque

INF = float("inf")


def _trace(parent, src, dst):
    if dst != src and dst not in parent:
        return []
    path = [dst]
    while path[-1] != src:
        path.append(parent[path[-1]])
    return path[::-1]


def _route(graph, src, dst, parent, order, cost=None):
    path = _trace(parent, src, dst)
    if cost is None and path:
        cost = graph.path_cost(path)
    return {"path": path, "order": order, "cost": cost if path else None}


def dijkstra(graph, src, dst, heuristic=None):
    """Shortest path with a binary heap. Passing a heuristic turns it into A*."""
    h = heuristic or (lambda v: 0)
    dist, parent, order, done = {src: 0}, {}, [], set()
    heap = [(h(src), src)]
    while heap:
        _, u = heapq.heappop(heap)
        if u in done:
            continue
        done.add(u)
        order.append(u)
        if u == dst:
            break
        for v, w, _ in graph.adj[u]:
            if dist[u] + w < dist.get(v, INF):
                dist[v] = dist[u] + w
                parent[v] = u
                heapq.heappush(heap, (dist[v] + h(v), v))
    return _route(graph, src, dst, parent, order, dist.get(dst))


def astar(graph, src, dst):
    """A* with a straight-line heuristic scaled so it never overestimates."""
    scale = min((graph.cost(i) / graph.pixel_distance(*graph.roads[i][:2])
                 for i in graph.open_roads()), default=0)
    return dijkstra(graph, src, dst, lambda v: scale * graph.pixel_distance(v, dst))


def bellman_ford(graph, src, dst):
    """Relaxes every road up to V-1 times; stops early when nothing changes."""
    dist, parent = {src: 0}, {}
    for _ in range(len(graph.nodes) - 1):
        changed = False
        for u in list(dist):
            for v, w, _ in graph.adj[u]:
                if dist[u] + w < dist.get(v, INF):
                    dist[v], parent[v], changed = dist[u] + w, u, True
        if not changed:
            break
    return _route(graph, src, dst, parent, sorted(dist, key=dist.get), dist.get(dst))


def bfs(graph, src, dst):
    """Fewest roads, ignoring how long each road is."""
    parent, seen, order, queue = {}, {src}, [], deque([src])
    while queue:
        u = queue.popleft()
        order.append(u)
        if u == dst:
            break
        for v, _, _ in graph.adj[u]:
            if v not in seen:
                seen.add(v)
                parent[v] = u
                queue.append(v)
    return _route(graph, src, dst, parent, order)


def dfs(graph, src, dst):
    """Depth-first search. Finds a route, but rarely the best one."""
    parent, seen, order, stack = {}, set(), [], [(src, None)]
    while stack:
        u, prev = stack.pop()
        if u in seen:
            continue
        seen.add(u)
        if prev is not None:
            parent[u] = prev
        order.append(u)
        if u == dst:
            break
        stack.extend((v, u) for v, _, _ in reversed(graph.adj[u]) if v not in seen)
    return _route(graph, src, dst, parent, order)


def kruskal(graph, src=None, dst=None):
    """Minimum spanning tree: take the cheapest roads that do not form a cycle."""
    root = list(range(len(graph.nodes)))

    def find(x):
        while root[x] != x:
            root[x] = root[root[x]]
            x = root[x]
        return x

    chosen, total = [], 0
    for i in sorted(graph.open_roads(), key=graph.cost):
        a, b = find(graph.roads[i][0]), find(graph.roads[i][1])
        if a != b:
            root[a] = b
            chosen.append(i)
            total += graph.cost(i)
    return {"mst": chosen, "cost": total, "path": [], "order": []}


def prim(graph, src=0, dst=None):
    """Minimum spanning tree grown outward from one junction."""
    seen, chosen, total = set(), [], 0
    heap = [(0, src, -1)]
    while heap:
        w, u, road = heapq.heappop(heap)
        if u in seen:
            continue
        seen.add(u)
        if road >= 0:
            chosen.append(road)
            total += w
        for v, cost, i in graph.adj[u]:
            if v not in seen:
                heapq.heappush(heap, (cost, v, i))
    return {"mst": chosen, "cost": total, "path": [], "order": []}


ALGORITHMS = {"dij": dijkstra, "astar": astar, "bf": bellman_ford,
              "bfs": bfs, "dfs": dfs, "kru": kruskal, "prim": prim}
ROUTING = {"Dijkstra": dijkstra, "A*": astar, "Bellman-Ford": bellman_ford,
           "BFS": bfs, "DFS": dfs}
