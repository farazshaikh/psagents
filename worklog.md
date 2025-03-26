# Worklog

* Saturday:
  Realized this a graphRAG problem, neo4j tutorial from Andrew Ng, More youtube videos
  Hurdle: Cannot syntesize vector similarity search & graph RAG.
* Monday:
  More Graph RAG, Microsoft GraphRAG
  Resolved: Have and intuitve sense of how semantic search works synergistically over knowledge graphs
  Hurdle: GO is not industry wide language for such projects its python.
  Task specifically asks this to be coded in GO. So I'll have "implement" Microsoft GraphRAG like implementation in GO
* Tuesday:   Mar 25 Approach Solidified

  Broad steps for this project are

  1. defining a project structure
  2. the project structure should be a data pipeline that updates a central graph db
     2.1 The pipeline should be phased
     2.2 Each generic pipeline takes usermsg.json as input and produces a set of updates to graphdb. The concrete phases are :
     2.3 Semantic search with threshold
     2.4 LLM based relationship extraction between message
     2.5  node addition to sentences themself
  3. Retrieval:
     UX that takes user query.
     Extracts nodes from the graph
     RAG to get the answer.
