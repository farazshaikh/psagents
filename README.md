# A billion PSAgents - Personal sovreign agents

PSAgent are sovreign AI artifacts(models or otherwise) that can perform social/financial interaction on behalf on an individual. The agent performed actions should ideally pass the "*personal indistinguistability experiment*" where an third party observer should not be able to distinguish actions as initiated by actual individual or his/her digital PSAgent incarnation.

> { P(Classify<sub>ExpAgent</sub>(Context) = Correct)    -  P(Classify<sub>ExpHuman</sub>(Context) = Correct) } == 0

## Personalality Indistiguisabality (PI) VS Turing test

The PI test is a extension of the **Turing Test** where we are not just testing for human emulation, but we are testing for a "particular human" being emulated.

## Conceptual recepie for building PSAgent

The design space of building PSAgents can be explored in many way and one generic forumulation is converting (personal information, context -> actions) into a semantic representation, and exterpolating actions for unseen contexts.

```mermaid
graph TD
  subgraph FineTune
    PI[Personal Info] --> SDB[Semantic Repr]
    C[Context] --> SDB
    A[Action] --> SDB
    end
    subgraph Inference
    UC[Unseen Context]-->P[Predict]
    P --> SDB[Semantic]
    SDB --> NA[Agent Action]
    end
```

# Practical Approach from implementing PSAgent

1. Fine tuning:
   Ideally collect ALL information about the human and fine tune a LLM with questions + answers pairs of the form
   Prompt - Hypothetical Question/Scenario
   Response - Ideal Answer/respose from the human
   The resulting fine tuned model will be an agent that will have the persona of the human whose info set we trained on.

Overall this transformation can be summarized as

```mermaid
graph LR
   LT[TextCorpus] --> GPT[Generative Transformer] --> GA[Generic Agent] --> FT[Fine Tune] --> PA[Personal Agent]
```

Note: The fine tuning step takes of semantic conversion of personal information into model weights.

2. RAG approach:
   This approach fundamentally differs from the fine tuning approach, where by we are using a Generic Agent to answer questions based on personalization info that is fed as the prompt. Its like asking a a friend/confidante/spouse/partner about how a person would react in a context !

Both the rag and fine-tuning approach have distinct qualitaitve and cost tradeoff. Most importantly the RAG approach is a low cost approach and scales well for large number of persona. The fine tuning approach will result in superior results on the indistinguisablity test (reasons not explained here), but will not scale to the load parameter of number of users. As number of users increase fine tuning and operational cost of individual LLMs will become exorbitantly prohibitive.

### Drilling down design space for a RAG based approach

We want to design a system for a large number of PSAgents thus we prefer the RAG approach for its scale. The functional goal is well connected knowledge graph and the trade-off is balancing the connectivity and avoiding a degnerate case of a fully connected graph. The data set is not huge, so scaling performance for single PSA agent is not a top concern, but we would like the data pipeline to be dynamic ie. we should be able to create, update and load such agents quickly in-and-out of context.

##### General Topology for the graph.

The schema for the graph can be derived in multiple ways. Its important that we don't throw the kitchen sink at the problem which will result in hyper connected graph (overfitting). Instead we limit ourselves to 3 types of relations and each having a well defined reasoning for it. We start with text message as nodes

1. Semantic threshold. Tsematicthreshold
   Connect related text messsage nodes with a semantic similarity threshold.
2. [LLM assisted] connectivity for distant nodes  Tllmthreshold = Range(Tmin, Tmax)
   We do LLM assisted connectivity
3. [LLM Assist] Synthetic Fanout for Nodes (NER, Intent, causal etc)
   So far we are only connecting nodes that originate from user text messages. We augment these node with LLM generated info/metadata nodes that hang off the text nodes.
4. Closing the loop.
   The newly nodes are connected in the existing nodes using a Semantic threshold step of 1.
5. Quantifying the relation strength.
   Conceptually we would like each edge to have a weight and this that we can extract a strongly weighted sub-graph to act as augmention for information retrieval. For now we simpilfy by distance weighted connectivity ie. closer nodes are more relevant.

```mermaid
graph TD
   subgraph KnowledgeGraph
    %% Main text message nodes
    TM1[Text Message 1]
    TM2[Text Message 2]
    TM3[Text Message 3]

    %% Synthetic nodes (NER, Intent, etc.)
    NER1[NER Node 1]
    INT1[Intent Node 1]
    CAU1[Causal Node 1]

    %% Semantic threshold connections (solid lines)
    TM1 -->|semanticthreshold| TM2
    TM2 -->|semanticthreshold| TM3

    %% LLM assisted distant connections (dashed lines)
    TM1 -.->|LLMAssist| TM3

    %% Synthetic fanout connections (dotted lines)
    TM1 ..-> NER1
    TM1 ..-> INT1
    TM2 ..-> CAU1

    %% Closing loop connections (solid lines with different style)
    NER1 -->|Tsemanticthreshold| INT1
    INT1 -->|Tsemanticthreshold| CAU1

    %% Edge weights based on distance (shown as numbers)
    TM1 -->|0.8| TM2
    TM2 -->|0.7| TM3
    TM1 -.->|0.5| TM3
   end

   %% Legend
   subgraph Legend
      L1["--> Semantic Threshold"]
      L2["-.-> LLM Assisted"]
      L3["..-> Synthetic Fanout"]
      L4["Edge Weight: Closer = Stronger"]
      L1 --- L2
      L2 --- L3
      L3 --- L4
   end

    %% Styling
    classDef textNode fill:#009,stroke:#333,stroke-width:2px
    classDef syntheticNode fill:#55,stroke:#333,stroke-width:2px

    class TM1,TM2,TM3 textNode
    class NER1,INT1,CAU1 syntheticNode
```

# PS Agents

A system for building and managing knowledge graphs from text messages using semantic similarity and LLM-assisted processing.

## Development Environment

This project uses Nix for reproducible development environments. To get started:

1. Install Nix:
   ```bash
   sh <(curl -L https://nixos.org/nix/install) --daemon
   ```

2. Enable flakes (optional but recommended):
   ```bash
   mkdir -p ~/.config/nix
   echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
   ```

3. Enter the development shell:
   ```bash
   nix develop
   ```

   Or if using direnv:
   ```bash
   echo "use nix" > .envrc
   direnv allow
   ```

The development environment includes:
- Go 1.21 and tools
- Language server (gopls)
- Linter (golangci-lint)
- Debugger (delve)
- Code formatters
- Version control tools
- Shell utilities
- Neo4j database

## Project Structure
