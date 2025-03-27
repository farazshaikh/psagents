package message

// Message represents a message with its text and metadata
type Message struct {
	ID    string   `json:"id"`
	Text  string   `json:"text"`
	Score float32  `json:"score,omitempty"`
}

// BatchRelationshipInput represents the input for batch relationship classification
type BatchRelationshipInput struct {
	Batch []struct {
		SourceMessage    Message   `json:"source_message"`
		FrontierMessages []Message `json:"frontier_messages"`
	} `json:"batch"`
}

// BatchRelationshipOutput represents the output from batch relationship classification
type BatchRelationshipOutput struct {
	Results []Relationship `json:"results"`
}

// LLMPrompt represents the structure for LLM relationship classification
type LLMPrompt struct {
	Instructions string `json:"instructions"`
	InputSchema  string `json:"input_schema"`
	Input        string `json:"input"`
	OutputSchema string `json:"output_schema"`
}

// RelationType represents the type of relationship between messages
type RelationType string

const (
	// Core relationship types
	RelationCausal           RelationType = "Causal"            // Direct cause-effect
	RelationFollowUp         RelationType = "Follow-up"         // Continues/refines previous
	RelationContrast         RelationType = "Contrast"          // Contradicts/changes stance
	RelationElaboration      RelationType = "Elaboration"       // Expands on previous idea
	RelationReframe          RelationType = "Reframe/Correction" // Rephrases/corrects previous
	RelationRoleInstruction  RelationType = "Role Instruction"  // Sets behavior/persona
	RelationScenarioSetup    RelationType = "Scenario Setup"    // Sets up context/world
	RelationTopicSwitch      RelationType = "Topic Switch"      // Unrelated new context
	RelationSelfReference    RelationType = "Self-Reference"    // Reflects on own message
	RelationMetaPrompting    RelationType = "Meta-Prompting"    // Cross-prompt instructions
	RelationIdentityExpress  RelationType = "Identity Expression" // Self-description/goals
)

// Relationship represents a classified relationship between messages
type Relationship struct {
	SourceID   string       `json:"source_id"`
	TargetID   string       `json:"target_id"`
	Type       RelationType `json:"relation"`
	Confidence float64      `json:"confidence"`
	Evidence   string       `json:"evidence"`
} 