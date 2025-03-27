# Graph Database

Hydrates the elements the Knowledge Graph as described in the README.md
The nodes of the graph are individual text messages, each messages is connected to top SimilarityAnchor count worth neighbours. Additionally we connect upto SemanticFrontier count of second degree connections using a LLM prompt to derive structural connections.

## General Algorithm

**First Pass** and **Second Pass** algorithms:

---

### 🔹 First Pass — Build Similarity Anchor Edges

```pseudo
for each message M in vector_database:
    top_K = find_top_K_similar_messages(M)
    for each message N in top_K:
        add_edge(M, N, type="isSimilar")
```

---

### 🔹 Second Pass — LLM-Assisted Semantic Relationships

```pseudo
for each message M in graph_db:
    for each message N where edge(M, N) is "isSimilar":
        frontier_neighbors = get_top_M_neighbors(N)
        for each message F in frontier_neighbors:
            relation = LLM_classify_relationship(M.text, F.text)
            add_edge(M, F, type=relation)
```

Sure! Here's the updated section with the **full set of relationship types** you defined earlier:

---

### 🧠 Note on `LLM_classify_relationship`

```pseudo
relation ∈ {
    "Causal",
    "Follow-up",
    "Contrast",
    "Elaboration",
    "Reframe/Correction",
    "Role Instruction",
    "Scenario Setup",
    "Topic Switch",
    "Self-Reference",
    "Meta-Prompting",
    "Identity Expression",
    "Unrelated"
}
```

Let me know if you'd like this list grouped by category (e.g. structural vs behavioral vs content) or visualized.

---

Let me know if you'd like these split into Go function stubs or pipeline steps.

## Relationship class extraction.

> **What are good relationship classes between the message and its semantic frontier neighbors, especially given that this is a single user talking to an assistant and we want the graph to emulate this person’s thinking and support answering on their behalf?**

Here’s a well-thought-out **taxonomy of relationship types** you can use for LLM classification between a message and its frontier neighbor:

---

### 🔗 Relationship Classes Between Messages


| Class                   | Description                                                                                          | Example                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **Causal**              | Message M causes or motivates N in some clear logical or narrative sense.                            | "I started astrophotography." → "What lens should I buy?"         |
| **Follow-up**           | N continues or refines the inquiry or context of M.                                                  | "Explain contrastive learning." → "Now explain with diagrams."    |
| **Contrast**            | N contradicts or changes a stance taken in M.                                                        | "I want to start yoga." → "I changed my mind, not yoga anymore."  |
| **Elaboration**         | N expands on the idea introduced in M, offering more detail, scope, or explanation.                  | "I love jazz music." → "What’s a good jazz album to start with?" |
| **Reframe/Correction**  | N rephrases or corrects M due to tone, factual error, or misunderstanding.                           | "Your response was sarcastic." → "Please answer more seriously."  |
| **Role Instruction**    | Message N instructs the LLM to adopt a new behavior or persona.                                      | "Act as a hypnotherapist."                                         |
| **Scenario Setup**      | M sets up a world or background that N interacts with or continues.                                  | "Here’s my sci-fi world..." → "Convert it into a comic."         |
| **Topic Switch**        | N is unrelated to M but marks the beginning of a new context or goal. Useful for boundary detection. | "I want to learn Python." → "Now help me write a poem."           |
| **Self-Reference**      | N reflects on the user’s own behavior or earlier message, often metacognitive.                      | "I want to eat healthier." → "Thanks, I will try it."             |
| **Meta-Prompting**      | Message instructs the assistant on how to behave in general across prompts.                          | "Act as an interviewer. Only reply with questions."                |
| **Identity Expression** | User is describing something about themselves: preferences, feelings, goals.                         | "I am a UX designer." → "I want to start blogging."               |

---

### 🧠 Why These Are Useful

- These relationship types **enrich the graph** with a structure that goes beyond “is similar to.”
- They let your retrieval and reasoning steps reflect **intent, goal evolution, and personality** of the user.
- They’re useful **features for downstream agent alignment and retrieval-augmented generation (RAG)**.

---

### Schema for LLM Assisted input and output.

We have the following schema we present to LLM, to get the connections in a batch.

Perfect — batching will reduce overhead and make LLM inference more efficient.

To support **batch input and output**, we simply need to slightly wrap the current schemas. Here's how you should structure the **batched input** and **batched output** schemas:

---

## 🧩 `batched_relationship_input.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Batched LLM Relationship Classification Input",
  "type": "object",
  "properties": {
    "batch": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source_message": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "text": { "type": "string" }
            },
            "required": ["id", "text"]
          },
          "frontier_messages": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "text": { "type": "string" }
              },
              "required": ["id", "text"]
            }
          }
        },
        "required": ["source_message", "frontier_messages"]
      }
    }
  },
  "required": ["batch"]
}
```

---

## 🧩 `batched_relationship_output.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Batched LLM Relationship Classification Output",
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source_id": { "type": "string" },
          "target_id": { "type": "string" },
          "relation": {
            "type": "string",
            "enum": [
              "Causal",
              "Follow-up",
              "Contrast",
              "Elaboration",
              "Reframe/Correction",
              "Role Instruction",
              "Scenario Setup",
              "Topic Switch",
              "Self-Reference",
              "Meta-Prompting",
              "Identity Expression",
              "Unrelated"
            ]
          },
          "confidence": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0
          },
          "evidence": { "type": "string" }
        },
        "required": ["source_id", "target_id", "relation", "confidence", "evidence"]
      }
    }
  },
  "required": ["results"]
}
```

---

## 🧪 Example Batched Input

```json
{
  "batch": [
    {
      "source_message": { "id": "msg_1", "text": "I want to learn photography." },
      "frontier_messages": [
        { "id": "msg_2", "text": "Start with a basic DSLR." },
        { "id": "msg_3", "text": "What’s your budget?" }
      ]
    },
    {
      "source_message": { "id": "msg_4", "text": "I am using Docker Compose." },
      "frontier_messages": [
        { "id": "msg_5", "text": "Mount the socket with this config." }
      ]
    }
  ]
}
```

## 🧪 Example Batched Output

```json
{
  "results": [
    {
      "source_id": "msg_1",
      "target_id": "msg_2",
      "relation": "Follow-up",
      "confidence": 0.91,
      "evidence": "Message 2 suggests a starting point for learning photography."
    },
    {
      "source_id": "msg_1",
      "target_id": "msg_3",
      "relation": "Follow-up",
      "confidence": 0.87,
      "evidence": "Message 3 seeks clarification needed to proceed with guidance."
    },
    {
      "source_id": "msg_4",
      "target_id": "msg_5",
      "relation": "Elaboration",
      "confidence": 0.89,
      "evidence": "Message 5 provides additional technical details in response to 4."
    }
  ]
}
```
