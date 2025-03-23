# A billion PSAgents - Personal sovreign agents

 PSAgent are sovreign AI artifacts(models or otherwise) that can perform social/financial interaction on behalf on an individual. The agent performed actions should ideally pass the "*personal indistinguistability experiment*" where an third party observer should not be able to distinguish actions as initiated by actual individual or his/her digital PSAgent incarnation.

> { P(Classify<sub>ExpAgent</sub>(Context) = Correct)    -  P(Classify<sub>ExpHuman</sub>(Context) = Correct) } == 0



## Personalality Indistiguisabality (PI) VS Turing test

The PI test is a extension of the **Turing Test** where we are not just testing for human emulation, but we are testing for a "particular human" being emulated.




## Conceptual recepie for building PSAgent

The design space of building PSAgents can be explored in many way and one generic forumulation is converting (personal information, context -> actions) into a semantic representation, and exterpolating actions for unseen contexts.

```mermaid
                    PersonalInformation-->SemanticDB
                    Context->SemanticDB
                    Action->SemanticDB

                    Predict(SemanticDB, unseen context) -> Action
```

# Practical Approach from implementing PSAgent
1. Fine tuning:
   Ideally collect ALL information about the human and fine tune a LLM with questions + answers pairs of the form
   Prompt - Hypothetical Question/Scenario
   Response - Ideal Answer/respose from the human
   The resulting fine tuned model will be an agent that will have the persona of the human whose info set we trained on.

Overall this transformation can be summarized as

```mermaid
(LargeTextCorpus) -> (GPT) -> (GenericAgent) -> FineTune(PersonalInformation, Context, Actions) -> (PersonalizedSovreignAgent)
```
Note: The fine tuning step takes of semantic conversion of personal information into model weights.


2. RAG approach:
   This approach fundamentally differs from the fine tuning approach, where by we are using a Generic Agent to answer questions based on personalization info that is fed as the prompt. Its like asking a a friend/confidante/spouse/partner about how a person would react in a context !

Both the rag and fine-tuning approach have distinct qualitaitve and cost tradeoff. Most importantly the RAG approach is a low cost approach and scales well for large number of persona. The fine tuning approach will result in superior results on the indistinguisablity test (reasons not explained here), but will not scale to the load parameter of number of users. As number of users increase fine tuning and operational cost of individual LLMs will become exorbitantly prohibitive.


### Drilling down design space for a RAG based approach

We want to design a system for a large number of PSAgents thus we prefer the RAG approach for its scale.


