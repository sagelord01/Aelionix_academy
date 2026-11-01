# AELIONIX ACADEMY
## Master AI Model Development Blueprint
**Project:** Personalized Intelligent Learning Environment  
**Initial subject:** Python programming  
**Long-term vision:** An intelligent learning system that helps people understand concepts, solve problems, build practical skills, and eventually work with AI to create software without needing to write every line of code manually.

---

# 1. THE VISION

Build Aelionix Academy into a genuinely intelligent, personalized technical learning environment, powered by a model-development and evaluation pipeline that can improve over time.

This is not simply a chatbot placed beside a code editor. The goal is to build a system that understands how a learner learns, identifies gaps in understanding, adapts its teaching strategy, monitors practical work, and helps the learner develop independent problem-solving ability.

Python is the first subject, not the permanent limit of the platform.

The architecture must eventually support other programming languages, computer science subjects, technical disciplines, and different learning pathways without requiring the entire system to be rebuilt.

The long-term ambition is to develop increasingly capable models and tutoring systems that can compete with leading AI systems on relevant educational and programming tasks. This is an ambitious research objective, not an assumed outcome.

# 2. WHAT WE ARE BUILDING

The project consists of five interconnected systems.

1. **Intelligent tutoring engine:** Explains concepts, diagnoses misconceptions, gives hints, evaluates understanding, and adapts instruction.
2. **Programming workspace:** Lets learners write and run code while the tutor observes relevant editor activity and execution results.
3. **Learner knowledge model:** Tracks demonstrated understanding, recurring mistakes, learning preferences, confidence, and retention over time.
4. **Model development pipeline:** Benchmarks existing models, prepares training datasets, fine-tunes selected models, and evaluates new versions.
5. **Continuous improvement system:** Identifies weaknesses, collects appropriate feedback, curates verified examples, and promotes model improvements only after evaluation.

These systems must work together. Fine-tuning alone will not produce the complete learning environment.

# 3. MODEL SELECTION STRATEGY

Do not choose a base model based only on popularity, parameter count, a leaderboard position, or a provider's marketing claims.

First, identify and benchmark capable open-weight models that are legally and practically usable for this project.

Potential model families to investigate include Qwen, Gemma, and other suitable open-weight coding or instruction models. Treat these as candidates, not predetermined winners. Verify each model's current availability, license, context window, hardware requirements, and fine-tuning compatibility before selection.

## Benchmark requirements

Evaluate candidates using the same test cases, prompts, curriculum, and scoring procedure.

Measure:

- Python code correctness.
- Reasoning through unfamiliar programming problems.
- Accuracy and clarity of explanations.
- Ability to identify misconceptions.
- Quality of progressive hints.
- Ability to avoid revealing answers prematurely.
- Adaptation to different learner proficiency levels.
- Debugging and error interpretation.
- Consistency across repeated attempts.
- Latency, inference memory, and operating cost.
- Suitability for parameter-efficient fine-tuning.

Separate general coding ability from tutoring ability. A model that writes excellent code is not automatically an excellent teacher.

Select the best overall candidate using documented scores and practical constraints.

Maintain a reproducible benchmark so future models can be compared against the same baseline.

# 4. TRAINING STRATEGY

Start with supervised fine-tuning (SFT), using LoRA or QLoRA when appropriate for the selected model and available compute.

Do not train a foundation model from scratch. Our resources are a personal laptop and free cloud resources, so training must be designed around realistic hardware limitations.

Use the following progression:

**Stage A — Baseline:** Run the original model against the benchmark and save its results.

**Stage B — Dataset preparation:** Build a carefully reviewed dataset of tutoring interactions, misconception diagnoses, hints, explanations, debugging examples, and exercises.

**Stage C — Initial fine-tuning:** Fine-tune the selected model on a manageable, high-quality dataset.

**Stage D — Evaluation:** Compare the fine-tuned model with the original model using identical test conditions.

**Stage E — Iteration:** Improve the dataset, training configuration, or model selection based on observed weaknesses.

Do not assume that more training, more parameters, or more examples automatically produce better results.

Preserve a copy of the original model and all successful checkpoints. Every training run must be reproducible and documented.

# 5. DATASET DEVELOPMENT

The quality of the training data is a major determinant of the system's usefulness.

We need data that teaches the model how to tutor, not merely data containing questions followed by correct answers.

## Required dataset categories

**A. Concept explanations**
- Beginner-friendly explanations of Python concepts.
- Multiple explanations of the same concept.
- Practical examples and analogies.
- Progressive movement from basic to advanced understanding.

**B. Misconception diagnosis**
- Incorrect learner answers.
- The underlying misconception.
- Evidence supporting the diagnosis.
- A corrective explanation.
- A follow-up question that checks understanding.

**C. Progressive hints**
- A first hint that points toward the relevant concept.
- A second hint that narrows the problem.
- A stronger hint that suggests a solution approach.
- A full worked solution when appropriate.

**D. Code debugging**
- Incorrect programs.
- Error messages and observed behavior.
- Root-cause analysis.
- Corrected code.
- Tests demonstrating the correction.

**E. Independent practice**
- Exercises of varying difficulty.
- Hidden test cases.
- Expected behavior.
- Rubrics for partial credit.
- Common incorrect approaches.

**F. AI-assisted programming**
- Examples where AI helps a learner understand an unfamiliar codebase.
- Explanations of code structure and design decisions.
- Guided implementation and debugging.
- Examples distinguishing useful assistance from simply completing the task for the learner.

**G. Retention and revision**
- Questions testing previously learned concepts.
- Exercises that combine multiple concepts.
- Examples identifying when a learner remembers a procedure but does not understand why it works.

## Dataset sources

Investigate reputable open educational resources, permissively licensed programming datasets, public Python exercises, documentation, and suitable open-source repositories.

Potential sources include official Python documentation, selected educational programming repositories, Hugging Face datasets, and verified examples created specifically for Aelionix Academy.

For every source, record its origin, license, permitted use, processing history, and known limitations.

Do not assume publicly accessible code or conversations are automatically permitted for training.

Do not collect private student conversations, personal information, API credentials, or confidential company code without appropriate authorization.

## Original data generation

Use capable existing models to help generate draft tutoring examples when useful. Treat generated examples as unverified until checked.

Validate code with execution and tests where possible. Have knowledgeable reviewers assess teaching quality, conceptual accuracy, and the validity of misconception labels.

Avoid contaminating evaluation sets with training examples.

Store dataset versions, provenance, quality checks, and reviewer decisions.

# 6. THE AELIONIX ADAPTIVE TUTOR

The tutor must follow a consistent instructional process.

1. Determine what the learner is trying to understand.
2. Check relevant prior knowledge.
3. Explain the concept at an appropriate level.
4. Ask the learner to predict, explain, or implement something.
5. Inspect the learner's response or code.
6. Identify the likely misconception or knowledge gap.
7. Provide a hint or explanation appropriate to that gap.
8. Ask the learner to try again.
9. Reveal a worked solution when appropriate.
10. Verify understanding with a new question or practical task.
11. Update the learner's knowledge estimates and revision schedule.

The system should not treat a correct answer as conclusive proof of understanding. The learner may have guessed, copied an answer, or memorized a pattern without understanding it.

Likewise, one incorrect answer should not permanently label a learner as weak in a particular concept.

Use repeated evidence, task difficulty, assistance level, and subsequent performance to estimate mastery.

## Two tutoring modes

**Independent Coding Coach**

The learner writes their own code. The AI observes relevant code changes, execution results, and test failures. It offers feedback, progressive hints, and debugging guidance without immediately taking over the task.

**AI-Assisted Coding Partner**

The AI can help generate, explain, review, or modify code. It must explain the reasoning behind significant changes and help the learner understand the result.

Both modes should be available, with the learner able to switch between them. The tutor should adjust how much assistance it provides according to the learning objective and the learner's demonstrated understanding.

# 7. LEARNER KNOWLEDGE MODEL

Maintain a structured, evolving representation of the learner's progress.

Track:

- Learner-selected goals and proficiency level.
- Curriculum concepts and prerequisite relationships.
- Exercise attempts and results.
- Misconceptions observed.
- Hints requested and assistance received.
- Time and attempts where useful.
- Evidence of independent performance.
- Retention and revision results.
- Confidence estimates and uncertainty.
- Preferred explanation styles, when demonstrated or explicitly selected.

Represent knowledge at the concept level rather than relying on one overall progress percentage.

For example, a learner may understand variables but struggle with loops, function scope, or debugging.

Use this information to select the next lesson, recommend revision, adjust difficulty, and determine when to revisit prerequisites.

Keep personal learner data separate from shared model-training datasets. Any use of learner interactions for training must follow appropriate consent, privacy, and retention rules.

# 8. INITIAL PYTHON CURRICULUM

Create a structured curriculum covering:

1. Programming fundamentals and computational thinking.
2. Values, variables, and data types.
3. Operators and expressions.
4. Conditional statements and Boolean logic.
5. Loops and iteration.
6. Functions, parameters, return values, and scope.
7. Strings and collections.
8. Dictionaries, sets, and data structures.
9. Exceptions and debugging.
10. Modules, packages, and environments.
11. Files and data handling.
12. Object-oriented programming.
13. Testing, code quality, and maintainability.
14. APIs, databases, and practical application development.
15. Projects that combine multiple concepts.

Each concept should include learning objectives, prerequisite concepts, explanations, examples, exercises, common misconceptions, tests, and revision questions.

Keep curriculum content separate from model weights so that lessons can be corrected or expanded without requiring a new fine-tuning run.

# 9. EVALUATION FRAMEWORK

Build a dedicated benchmark before beginning substantial training.

Every candidate model must be evaluated on the same held-out test set.

Measure:

**Code accuracy:** Does the proposed program behave correctly?

**Teaching quality:** Is the explanation accurate, understandable, and appropriate for the learner?

**Diagnostic accuracy:** Does the tutor correctly identify the cause of a mistake instead of guessing?

**Hint quality:** Does assistance help the learner make progress without unnecessarily disclosing the answer?

**Learning transfer:** Can the learner solve a different problem using the same underlying concept?

**Retention:** Can the learner demonstrate understanding after a delay?

**Independent competence:** Can the learner complete appropriate tasks without AI assistance?

**Robustness:** Does the system handle ambiguous questions, unexpected code, and unfamiliar examples sensibly?

**Safety and reliability:** Does it avoid executing dangerous code without appropriate controls and communicate uncertainty honestly?

Use executable tests for code correctness, structured rubrics for instructional quality, and human review for difficult judgments.

Where possible, use controlled learning experiments to measure whether learners improve. Model preference alone is not evidence that the learning system is effective.

Define minimum acceptance criteria before evaluating each new version.

# 10. CONTINUOUS LEARNING PIPELINE

Continuous learning must be evidence-driven and controlled.

The system should not automatically update deployed model weights after every conversation.

Use the following process:

1. Observe failures through evaluation results and authorized feedback.
2. Categorize the weakness: curriculum gap, model reasoning failure, poor instructions, missing context, or software defect.
3. Collect suitable examples with appropriate privacy safeguards.
4. Review and verify the examples.
5. Add approved examples to a versioned training dataset.
6. Retrain only when enough valuable data exists or a significant weakness justifies an experiment.
7. Run the full benchmark and regression tests.
8. Compare the candidate with the currently deployed model.
9. Promote it only when predefined acceptance criteria are satisfied.
10. Preserve rollback capability and monitor performance after deployment.

Not every problem should be solved by fine-tuning. A missing lesson may require better retrieval. An incorrect mastery estimate may require changes to the learner model. A broken code execution service requires a software fix.

Use the least expensive, most appropriate intervention.

# 11. TECHNICAL ARCHITECTURE

Design the platform as modular components.

**Application:** The existing Aelionix Academy web application.

**Tutor orchestration:** Coordinates lesson context, learner state, prompts, tools, and model responses.

**Model interface:** Provides a consistent interface for hosted models, local inference, and fine-tuned model endpoints.

**Code execution:** Runs learner programs in an isolated environment with time, memory, network, and filesystem restrictions.

**Curriculum retrieval:** Retrieves relevant lesson material, examples, exercises, and approved reference content.

**Learner state service:** Records concept mastery estimates, attempts, revision schedules, and relevant learning history.

**Evaluation service:** Runs model benchmarks, code tests, regression checks, and quality reports.

**Training pipeline:** Prepares datasets, launches training jobs, records configurations, and manages checkpoints.

**Model registry:** Records model versions, source model, dataset version, training configuration, benchmark results, license, and deployment status.

**Monitoring:** Measures response quality, latency, failures, usage, and inference costs without unnecessarily collecting sensitive content.

Use stable interfaces between components so individual models, curricula, and execution environments can be replaced without rebuilding the entire product.

# 12. TECHNOLOGY AND INFRASTRUCTURE

Investigate and select appropriate tools based on current compatibility and resource requirements.

Potential components include:

- Python for model training, evaluation, and orchestration services where appropriate.
- Hugging Face Transformers and Datasets.
- PEFT for parameter-efficient fine-tuning.
- TRL for supported supervised fine-tuning workflows.
- Accelerate and compatible quantization tools where required.
- GitHub for application code, benchmark definitions, and version control.
- Hugging Face for suitable datasets, model artifacts, and model documentation.
- A database for curriculum records, learner progress, exercises, and evaluation metadata.
- A secure sandbox for code execution.
- A model-serving interface that can initially use an existing provider and later support our own model.

Do not assume that all training can run on the laptop or that free cloud GPUs are always available.

First inspect the actual hardware, operating system, available RAM, storage, GPU capabilities, and current free-tier restrictions. Then choose a model that can realistically be tested and fine-tuned.

Check current licenses, quotas, costs, and service limitations before committing to an infrastructure choice.

Keep paid infrastructure optional until its value and affordability have been established.

# 13. GITHUB AND HUGGING FACE ORGANIZATION

Use GitHub as the source of truth for code, benchmark definitions, evaluation rubrics, training configurations, and documentation.

Use Hugging Face for appropriately licensed datasets, model cards, and model artifacts where permitted.

Suggested repository structure:

- `benchmarks/` — evaluation tasks and scoring rubrics.
- `datasets/` — schemas, dataset documentation, and preparation scripts; avoid committing sensitive or restricted data.
- `training/` — fine-tuning configurations and training scripts.
- `evaluation/` — benchmark runners, regression tests, and reports.
- `models/` — model metadata and version manifests rather than large weights by default.
- `curriculum/` — structured curriculum definitions and concept relationships.
- `tutor/` — tutoring policies and orchestration logic.
- `docs/` — architecture, decisions, and experiment records.

Use versioned dataset manifests and model metadata to make experiments reproducible.

# 14. DEVELOPMENT PHASES

## Phase 1 — Baseline and feasibility

- Inspect the existing Aelionix Academy application and repository.
- Verify existing features rather than rebuilding completed work.
- Inspect available compute resources.
- Shortlist appropriate open-weight models.
- Create the initial Python tutoring benchmark.
- Run baseline evaluations where practical.
- Document limitations and model selection evidence.

**Exit condition:** A reproducible baseline and a justified initial model choice.

## Phase 2 — Dataset and curriculum foundation

- Define data schemas and quality standards.
- Structure the Python curriculum.
- Identify suitable open datasets and their licenses.
- Create original tutoring examples.
- Build validation and review workflows.
- Establish training, validation, and test splits.

**Exit condition:** A documented, quality-controlled initial dataset and a reliable evaluation set.

## Phase 3 — First fine-tuned model

- Select a compatible training configuration.
- Run an initial SFT experiment with LoRA or QLoRA where feasible.
- Track compute usage, training loss, checkpoints, and configuration.
- Evaluate against the original baseline.
- Inspect failure cases and regressions.

**Exit condition:** A reproducible experiment demonstrating measurable strengths and weaknesses.

## Phase 4 — Integration with the tutoring application

- Connect the model through the model interface.
- Supply curriculum context through retrieval.
- Implement progressive hints and answer disclosure policies.
- Integrate relevant IDE code, test results, and execution feedback.
- Connect the tutor to the learner knowledge model.
- Add error handling, privacy safeguards, and cost monitoring.

**Exit condition:** A functional end-to-end Python tutoring experience.

## Phase 5 — Learning validation

- Pilot with consenting learners.
- Measure task completion and independent problem-solving.
- Test delayed retention and transfer to unfamiliar problems.
- Review incorrect diagnoses and unhelpful hints.
- Improve the curriculum, tutoring logic, and model based on evidence.

**Exit condition:** Documented learning outcomes and a prioritized improvement plan.

## Phase 6 — Quality-based continuous improvement

- Build the approved example collection workflow.
- Automate benchmark and regression evaluation.
- Run training experiments when justified by evidence.
- Register successful model versions.
- Deploy gradually with rollback support.
- Monitor performance and costs.

**Exit condition:** A repeatable, controlled improvement cycle.

## Phase 7 — Expansion

After the Python system is reliable, expand to other programming languages and technical subjects.

Reuse the learner model, tutor orchestration, benchmark framework, and training pipeline. Introduce subject-specific curricula, tools, datasets, and evaluations.

Do not assume a model that performs well in Python will automatically teach every other discipline effectively.

# 15. LONG-TERM RESEARCH DIRECTION

The long-term objective is not simply to produce a chatbot that generates code.

Explore systems that help learners move from understanding concepts to describing intended behavior, reasoning about software, reviewing AI-generated implementations, testing solutions, and collaborating effectively with AI tools.

Potential research areas include:

- Personalized curriculum planning.
- Automated misconception discovery.
- Long-term knowledge retention.
- Code understanding and debugging.
- Tool-using AI tutors.
- Adaptive problem generation.
- Model distillation and specialized fine-tuning.
- Preference optimization based on verified tutoring quality.
- Learning from human-reviewed corrections.
- Natural-language-to-program workflows with explanation and verification.

Explore advanced training approaches only when the baseline, dataset quality, evaluation methodology, and available resources justify them.

Never assume that repeated fine-tuning alone will make a model competitive with the largest frontier models. Progress must be demonstrated through measured results.

# 16. NON-NEGOTIABLE PRINCIPLES

1. Benchmark before choosing a model.
2. Measure before fine-tuning.
3. Prioritize data quality over dataset size.
4. Separate curriculum retrieval from model training.
5. Distinguish coding performance from teaching performance.
6. Use verified examples and executable tests whenever possible.
7. Protect learner privacy.
8. Never deploy a new model without regression testing.
9. Preserve reproducibility and rollback capability.
10. Avoid unnecessary paid infrastructure.
11. Design for multiple subjects from the beginning, while validating Python first.
12. Improve the learner's understanding, not merely their dependence on AI.

# 17. INSTRUCTIONS TO THE IMPLEMENTING AI

Act as a machine-learning research engineer, educational AI architect, and practical implementation mentor.

Use this blueprint as the persistent project specification.

Do not attempt to implement every phase simultaneously. Work incrementally, explain important technical decisions, and distinguish verified facts from assumptions.

At each stage:

1. Inspect the current project and available resources.
2. Identify the current phase and its acceptance criteria.
3. Verify relevant model documentation, licensing, tool compatibility, and current infrastructure limitations.
4. Propose the smallest useful next step.
5. Implement only what belongs to that step when implementation is requested.
6. Test the result and report actual outcomes.
7. Record decisions, artifacts, benchmark results, and unresolved issues.
8. Recommend the next step only after the current acceptance criteria are satisfied.

Do not claim a model has been trained, a benchmark has passed, a dataset has been validated, or a deployment has succeeded unless the relevant operation was actually completed and its results inspected.

The first immediate task is to establish the model benchmark and compute-feasibility assessment. Do not begin a substantial training run before we have a baseline and a justified candidate.

Our goal is to build Aelionix Academy into a serious, measurable, continuously improving intelligent learning platform—not merely to fine-tune a model for the sake of saying that we trained one.
