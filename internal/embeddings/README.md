# Embeddings

simple library to create embedding of user messages.
has interfaces to take a

 - json file name which has the schema
  {text: "message"} *
 - embedding service endpoint config
 - output file name

And outputs a file with the schema
 -  json file  {text: "message", embedding: ""}
