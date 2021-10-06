/**

  The InfoGraph class manages dependencies across assets

  To use:
  - Add nodes via addNode to register id, type and update function
  - Add edges via addEdge
  - Call trigger with an optional payload
  - The dependency tree will be walked and topologically sorted

**/

const toposort = require("toposort")


/**

  Node Class

**/

class Node {
  constructor(id, type, update) {
    this.id = id
    this.type = type
    this.update = update
  }
}


/**

  InfoGraph Class

**/

class InfoGraph {

  constructor() {
    this.nodes = {}
    this.adjacencyList = {}
  }


  addNode(id, type, updateFunction) {
    updateFunction = updateFunction || function() { return Promise.resolve() }
    this.nodes[id] = new Node(id, type, updateFunction)
    global.shipp.debug(`Adding node ${id} of type ${type}`)
  }


  getNode(id) {
    if (!this.hasNode(id))
      throw new Error("Node does not exist")
    return this.nodes[id]
  }

  hasNode(id) {
    return this.nodes.hasOwnProperty(id)
  }

  removeNode(id) {
    delete this.nodes[id]
    delete this.adjacencyList[id]
    for (var item in this.adjacencyList)
      this.adjacencyList[item].remove(id)
  }


  getAllEdges() {
    const ids = Object.keys(this.adjacencyList)
    const allEdges = []
    for (let i in ids)
      this.getEdges(ids[i]).forEach(function(edge) { allEdges.push(edge) })
    return allEdges
  }


  getEdges(id) {

    // Convenience method
    if ("undefined" === typeof(id))
      return this.getAllEdges()

    // Single id
    const list = this.adjacencyList[id] || new Set()
    const edges = new Array()
    list.forEach(function(childId) {
      edges.push([id, childId])
    })
    return edges

  }


  addEdge(fromId, toId) {
    const edges = this.adjacencyList[fromId] || new Set()
    edges.add(toId)
    this.adjacencyList[fromId] = edges
    global.shipp.debug(`Adding edge from ${fromId} to ${toId}`)
  }


  removeEdge(fromId, toId) {
    const edges = this.adjacencyList[fromId] || new Set()
    edges.remove(toId)
    this.adjacencyList[fromId] = edges
  }


  getExecutionSequence(id) {

    if (!id || !this.hasNode(id)) return []

    const visited = new Set()
    const unvisited = [id]

    const graph = []

    while (unvisited.length) {

      // Mark ID as visited
      const _id = unvisited.shift()
      visited.add(_id)

      // Add edges to the graph
      const edges = this.getEdges(_id)
      graph.push(...edges)

      // Traverse new edges
      edges.forEach(function(edge) {
        if (!visited.has(edge[1])) unvisited.push(edge[1])
      })

    }

    return toposort(graph)

  }


  async trigger(id, payload={}) {

    const sequence = this.getExecutionSequence(id)
    global.shipp.debug(`Sequence triggered for ${id}. Sequence ${sequence}. Payload ${JSON.stringify(payload)}`)

    for (var i in sequence) {
      const id = sequence[i]
      const node = this.getNode(id)
      await node.update(payload)
    }

  }

}


/**

  Exports

**/

module.exports = InfoGraph
