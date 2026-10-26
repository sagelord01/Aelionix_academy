/**
 * Source of truth for the initial Python curriculum.
 *
 * `npm run seed:generate` turns this file into `supabase/seed.sql`.
 * Content is stored in Postgres at runtime; this file is only used for
 * seeding and for public marketing previews.
 */

export const concepts = [
  {
    slug: "variables",
    title: "Variables",
    description: "Naming values and keeping track of program state.",
  },
  {
    slug: "data-types",
    title: "Data types",
    description: "Strings, integers, floats, booleans, and type checking.",
  },
  {
    slug: "strings",
    title: "Strings",
    description: "Creating, inspecting, cleaning, and formatting text.",
  },
  {
    slug: "booleans",
    title: "Boolean logic",
    description: "Comparisons, truth values, and combining conditions.",
  },
  {
    slug: "conditionals",
    title: "Conditionals",
    description: "Branching with if, elif, and else.",
  },
  {
    slug: "loops",
    title: "Loops and iteration",
    description: "Repeating work with for and while loops.",
  },
  {
    slug: "lists",
    title: "Lists",
    description: "Ordered collections, indexing, and mutation.",
  },
  {
    slug: "dictionaries",
    title: "Dictionaries",
    description: "Key-value data, lookup, and frequency counting.",
  },
  {
    slug: "functions",
    title: "Functions",
    description: "Reusable behavior, parameters, return values, and defaults.",
  },
  {
    slug: "debugging",
    title: "Debugging",
    description: "Reading tracebacks, testing assumptions, and isolating faults.",
  },
  {
    slug: "exceptions",
    title: "Exceptions",
    description: "Raising and handling errors deliberately.",
  },
  {
    slug: "files",
    title: "Files",
    description: "Reading and writing files with context managers.",
  },
  {
    slug: "modules",
    title: "Modules",
    description: "Splitting code into reusable, importable units.",
  },
  {
    slug: "classes",
    title: "Classes and objects",
    description: "Modeling state and behavior with objects.",
  },
  {
    slug: "problem-decomposition",
    title: "Problem decomposition",
    description: "Breaking a problem into testable pieces before coding.",
  },
];

export const pythonTrack = {
  slug: "python-foundations",
  title: "Python Foundations",
  description:
    "A first, practical path through the Python you need to solve real problems: values, control flow, collections, functions, errors, files, classes, and a small project.",
  position: 1,
  lessons: [
    {
      slug: "variables-and-types",
      title: "Values, variables, and types",
      description:
        "Store information in named variables and learn which type each value has.",
      difficulty: "beginner",
      estimatedMinutes: 25,
      position: 1,
      concepts: ["variables", "data-types"],
      prerequisites: [],
      objectives: [
        "Create variables with meaningful names",
        "Distinguish strings, integers, floats, and booleans",
        "Predict the type of a value",
        "Reassign a variable and explain what changes",
      ],
      content: {
        intro:
          "A program works by keeping track of values. A variable is a name attached to a value, and Python infers the value's type from the value itself.",
        sections: [
          {
            title: "Assignment",
            paragraphs: [
              "The equals sign assigns a value to a name. The name is on the left, the value is evaluated on the right, and only then is it stored.",
              "Names are case-sensitive. `score` and `Score` are different variables. Choose descriptive names: `remaining_attempts` is clearer than `x`.",
            ],
            code: `learner_name = "Ada"\ncompleted_lessons = 3\naccuracy = 0.875\nis_enrolled = True`,
          },
          {
            title: "Types matter",
            paragraphs: [
              "`\"42\"` is text. `42` is an integer, and `42.0` is a float. They may look similar when printed, but they behave differently: you can add numbers, but `\"42\" + 1` raises a TypeError.",
              "Use `type(value)` when you need to inspect a value. A boolean is either `True` or `False`; Python capitalizes both.",
            ],
            code: `print(type("42"))    # <class 'str'>\nprint(type(42))      # <class 'int'>\nprint(type(42.0))    # <class 'float'>\nprint(type(True))    # <class 'bool'>`,
          },
          {
            title: "Reassignment",
            paragraphs: [
              "A variable can point at a new value later. Reassigning does not mutate the old value; it changes which value the name refers to.",
            ],
            code: `attempts = 1\nattempts = attempts + 1\nprint(attempts)  # 2`,
          },
        ],
        keyPoints: [
          "A variable is a name bound to a value.",
          "Python infers types; you can inspect them with type().",
          "Use descriptive names, and remember names are case-sensitive.",
        ],
      },
      exercises: [
        {
          slug: "build-a-profile",
          title: "Build a profile",
          difficulty: "beginner",
          position: 1,
          instructions:
            "Create four variables with exactly these names and values:\n\n• name = \"Ada\"\n• birth_year = 1815\n• is_programmer = True\n• height_m = 1.68\n\nDo not print anything for this exercise. The tests inspect the variables directly.",
          expectedBehavior:
            "The four names exist with the requested values and types: str, int, bool, and float.",
          starterCode:
            'name = ""\nbirth_year = 0\nis_programmer = False\nheight_m = 0.0\n',
          hints: [
            "Read the instructions once more and list the four values with their types.",
            "Strings need quotes. Booleans are capitalized: True and False.",
            "The year is a whole number. The height has a decimal point.",
            "Replace each placeholder value while keeping the variable names unchanged.",
          ],
          tests: [
            {
              name: "name stores the text Ada",
              code: 'assert name == "Ada"',
              hidden: false,
            },
            {
              name: "birth_year is an integer",
              code: "assert birth_year == 1815\nassert isinstance(birth_year, int)\nassert not isinstance(birth_year, bool)",
              hidden: false,
            },
            {
              name: "is_programmer is a boolean",
              code: "assert is_programmer is True",
              hidden: false,
            },
            {
              name: "height_m is a float",
              code: "assert isinstance(height_m, float)\nassert abs(height_m - 1.68) < 1e-9",
              hidden: true,
            },
          ],
        },
        {
          slug: "temperature-conversion",
          title: "Store a temperature conversion",
          difficulty: "beginner",
          position: 2,
          instructions:
            "Start with `celsius = 21.0`. Create a variable named `fahrenheit` that converts it using the formula F = C × 9 / 5 + 32.\n\nDo not print anything. Keep the calculation in code rather than typing the answer.",
          expectedBehavior:
            "celsius stays 21.0 and fahrenheit is 69.8 (as a float).",
          starterCode: "celsius = 21.0\n# create fahrenheit from celsius\n",
          hints: [
            "Use the existing variable rather than the literal 21.0.",
            "Python uses * for multiplication and / for division.",
            "The expression is celsius * 9 / 5 + 32.",
          ],
          tests: [
            {
              name: "celsius is unchanged",
              code: "assert celsius == 21.0",
              hidden: false,
            },
            {
              name: "fahrenheit is calculated",
              code: "assert abs(fahrenheit - 69.8) < 1e-9",
              hidden: false,
            },
            {
              name: "fahrenheit is a float",
              code: "assert isinstance(fahrenheit, float)",
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "strings-and-output",
      title: "Strings, formatting, and output",
      description:
        "Clean text, combine strings, and produce readable output with f-strings.",
      difficulty: "beginner",
      estimatedMinutes: 30,
      position: 2,
      concepts: ["strings"],
      prerequisites: ["variables-and-types"],
      objectives: [
        "Use string methods such as strip, lower, and replace",
        "Build readable output with f-strings",
        "Write a function that returns a value instead of printing it",
      ],
      content: {
        intro:
          "Most useful programs do something with text: names, messages, labels, file contents, or user input. Strings are immutable, so methods return new strings rather than changing the original.",
        sections: [
          {
            title: "Useful string methods",
            paragraphs: [
              "`strip()` removes whitespace from both ends. `lower()` and `upper()` change case. `replace(old, new)` substitutes text.",
              "These methods do not modify the original string. If you want to keep the result, assign it or return it.",
            ],
            code: `raw = "  Hello, World  "\ncleaned = raw.strip().lower()\nprint(cleaned)          # hello, world\nprint(raw)              # "  Hello, World  "`,
          },
          {
            title: "f-strings",
            paragraphs: [
              "An f-string embeds expressions directly in text. It is the clearest way to combine labels and values.",
            ],
            code: `first = "Ada"\nlessons = 12\nprint(f"{first} has completed {lessons} lessons.")`,
          },
          {
            title: "Return, don't print",
            paragraphs: [
              "A function that returns a string can be tested, reused, and composed. A function that only prints is harder to test because the output is not a value.",
            ],
            code: `def label(name):\n    return name.strip().title()\n\nprint(label("  aDA "))  # Ada`,
          },
        ],
        keyPoints: [
          "Strings are immutable; methods produce new strings.",
          "f-strings interpolate expressions directly.",
          "Prefer returning values over printing inside reusable functions.",
        ],
      },
      exercises: [
        {
          slug: "format-a-name",
          title: "Format a name",
          difficulty: "beginner",
          position: 1,
          instructions:
            'Write a function `format_name(first, last)` that returns the name in "Last, First" form.\n\nRemove surrounding whitespace from each part and capitalize each word. For example:\n\nformat_name("  ada ", "LOVELACE")  →  "Lovelace, Ada"\n\nReturn the string; do not print it.',
          expectedBehavior:
            "The returned string has no surrounding whitespace, each part is title-cased, and the order is last name, comma, space, first name.",
          starterCode:
            'def format_name(first, last):\n    # Return a formatted name\n    return ""\n',
          hints: [
            "You need to clean each argument before combining them.",
            "String methods can be chained: part.strip().title().",
            "Combine the results with an f-string.",
            'The final shape is f"{clean_last}, {clean_first}".',
          ],
          tests: [
            {
              name: "formats a normal name",
              code: 'assert format_name("Ada", "Lovelace") == "Lovelace, Ada"',
              hidden: false,
            },
            {
              name: "trims and normalizes case",
              code: 'assert format_name("  grace ", "HOPPER ") == "Hopper, Grace"',
              hidden: false,
            },
            {
              name: "handles single-word parts",
              code: 'assert format_name("plato", "") == ", Plato"',
              hidden: true,
            },
          ],
        },
        {
          slug: "normalize-a-tag",
          title: "Normalize a tag",
          difficulty: "beginner",
          position: 2,
          instructions:
            'Write `normalize_tag(raw)` that turns messy text into a URL-style tag:\n\n1. Remove surrounding whitespace.\n2. Convert to lowercase.\n3. Replace spaces with hyphens.\n\nExample: normalize_tag("  Data  STRUCTURES ") → "data-structures"\n\nReturn the result.',
          expectedBehavior:
            "The function returns a lowercase, trimmed tag with spaces replaced by hyphens.",
          starterCode:
            'def normalize_tag(raw):\n    # Clean and normalize the tag\n    return raw\n',
          hints: [
            "Start with strip().",
            "Then lower().",
            "Finally replace(\" \", \"-\").",
            "You can chain all three methods on one line.",
          ],
          tests: [
            {
              name: "normalizes casing and spaces",
              code: 'assert normalize_tag("  Data  STRUCTURES ") == "data-structures"',
              hidden: false,
            },
            {
              name: "leaves an already clean tag unchanged",
              code: 'assert normalize_tag("python") == "python"',
              hidden: false,
            },
            {
              name: "handles a multi-space tag",
              code: 'assert normalize_tag("A  B") == "a--b"',
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "booleans-and-conditionals",
      title: "Booleans and conditional logic",
      description:
        "Make decisions with comparisons, if statements, and clear branch conditions.",
      difficulty: "beginner",
      estimatedMinutes: 35,
      position: 3,
      concepts: ["booleans", "conditionals"],
      prerequisites: ["strings-and-output"],
      objectives: [
        "Use comparison and logical operators",
        "Write if, elif, and else branches",
        "Handle invalid input with an explicit branch",
        "Explain the order in which conditions are evaluated",
      ],
      content: {
        intro:
          "Conditional logic lets a program choose a path. Python reads branches from top to bottom and runs the first branch whose condition is true.",
        sections: [
          {
            title: "Comparisons and truth",
            paragraphs: [
              "Comparisons produce booleans. `==` checks equality, while `=` assigns a value. Combine conditions with `and`, `or`, and `not`.",
              "Python treats several values as falsy: `False`, `None`, `0`, `\"\"`, and empty collections. Be explicit when the difference matters.",
            ],
            code: `score = 72\nprint(score >= 60)             # True\nprint(score >= 90 or score < 0)  # False\nprint(not score == 0)            # True`,
          },
          {
            title: "Branch order",
            paragraphs: [
              "The first matching branch wins. Put the most specific checks before the general fallback, and make the fallback an `else` rather than a separate condition when possible.",
            ],
            code: `def label(score):\n    if score < 0 or score > 100:\n        return "invalid"\n    if score >= 90:\n        return "strong"\n    if score >= 60:\n        return "passing"\n    return "needs practice"`,
          },
        ],
        keyPoints: [
          "Comparisons return booleans; == is not =.",
          "Only the first true branch executes.",
          "Validate the edges before the normal range.",
        ],
      },
      exercises: [
        {
          slug: "classify-score",
          title: "Classify a score",
          difficulty: "beginner",
          position: 1,
          instructions:
            'Write `classify_score(score)` returning:\n\n• "invalid" when score is below 0 or above 100\n• "strong" when score is at least 90\n• "passing" when score is at least 60\n• "retry" otherwise\n\nHandle the invalid range first.',
          expectedBehavior:
            "Every number from 0 to 100 receives exactly one label; values outside the range return invalid.",
          starterCode:
            'def classify_score(score):\n    # Return one of: invalid, strong, passing, retry\n    return ""\n',
          hints: [
            "Start by checking the invalid range with an if and return early.",
            "After that, the remaining conditions can assume 0–100.",
            "Order the checks from most demanding to least demanding.",
            "strong at 90+, then passing at 60+, then retry as the fallback.",
          ],
          tests: [
            {
              name: "classifies a passing score",
              code: 'assert classify_score(75) == "passing"',
              hidden: false,
            },
            {
              name: "classifies a strong score",
              code: 'assert classify_score(90) == "strong"',
              hidden: false,
            },
            {
              name: "rejects out-of-range scores",
              code: 'assert classify_score(-1) == "invalid"\nassert classify_score(101) == "invalid"',
              hidden: false,
            },
            {
              name: "classifies a low score",
              code: 'assert classify_score(0) == "retry"\nassert classify_score(59.9) == "retry"',
              hidden: true,
            },
          ],
        },
        {
          slug: "can-access",
          title: "Access check",
          difficulty: "beginner",
          position: 2,
          instructions:
            'Write `can_access(age, is_member, has_guest_pass)` that returns True when at least one of these is true:\n\n• the person is 18 or older AND is a member\n• the person has a guest pass\n\nOtherwise return False. Use boolean logic rather than nested if statements if you can.',
          expectedBehavior:
            "The function returns a boolean for every combination of the three arguments.",
          starterCode:
            "def can_access(age, is_member, has_guest_pass):\n    # Return True or False\n    return False\n",
          hints: [
            "Combine each rule with and, then combine the rules with or.",
            "The age comparison is age >= 18.",
            "Wrap the full expression in return.",
          ],
          tests: [
            {
              name: "adult members are allowed",
              code: "assert can_access(30, True, False) is True",
              hidden: false,
            },
            {
              name: "guest pass allows entry",
              code: "assert can_access(12, False, True) is True",
              hidden: false,
            },
            {
              name: "non-member adult without a pass is denied",
              code: "assert can_access(30, False, False) is False",
              hidden: false,
            },
            {
              name: "minors without a pass are denied",
              code: "assert can_access(17, True, False) is False",
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "loops-and-iteration",
      title: "Loops and iteration",
      description:
        "Repeat work over sequences and reason about when a loop should stop.",
      difficulty: "beginner",
      estimatedMinutes: 40,
      position: 4,
      concepts: ["loops"],
      prerequisites: ["booleans-and-conditionals"],
      objectives: [
        "Iterate over a list with a for loop",
        "Accumulate a result across iterations",
        "Use range for a known number of repetitions",
        "Avoid infinite while loops",
      ],
      content: {
        intro:
          "Loops repeat a block of code. A `for` loop visits items in a sequence. A `while` loop continues while a condition remains true.",
        sections: [
          {
            title: "Accumulating",
            paragraphs: [
              "A common pattern is to start with a neutral value and update it on each pass. For a sum, start at 0. For a product, start at 1. For a list of results, start with an empty list.",
            ],
            code: `numbers = [3, 8, 2]\ntotal = 0\nfor number in numbers:\n    total += number\nprint(total)  # 13`,
          },
          {
            title: "while loops need progress",
            paragraphs: [
              "A `while` loop must change something that affects its condition, or it may never stop. Add a clear update inside the loop and test the stopping case.",
            ],
            code: `countdown = 3\nwhile countdown > 0:\n    print(countdown)\n    countdown -= 1\nprint("go")`,
          },
          {
            title: "Filtering inside a loop",
            paragraphs: [
              "Conditionals inside loops let you select or transform items. Keep the condition close to where the item is handled so the logic stays readable.",
            ],
            code: `evens = []\nfor number in [1, 2, 3, 4, 5, 6]:\n    if number % 2 == 0:\n        evens.append(number)`,
          },
        ],
        keyPoints: [
          "for visits values; while repeats until a condition changes.",
          "Initialize accumulators before the loop.",
          "A while loop must make progress toward stopping.",
          "The modulo operator % reveals divisibility.",
        ],
      },
      exercises: [
        {
          slug: "sum-of-evens",
          title: "Sum the even numbers",
          difficulty: "beginner",
          position: 1,
          instructions:
            "Write `sum_even(numbers)` that returns the sum of all even integers in the list. Return 0 when there are no even numbers.\n\nUse a loop. Negative even numbers count as even.",
          expectedBehavior:
            "Returns an integer sum; the original list is not modified.",
          starterCode:
            "def sum_even(numbers):\n    total = 0\n    # Add even numbers to total\n    return total\n",
          hints: [
            "You already have an accumulator named total.",
            "Inside the loop, test whether the current number is even.",
            "number % 2 == 0 is true for even numbers.",
            "Add the number to total only inside the even branch.",
          ],
          tests: [
            {
              name: "sums a mixed list",
              code: "assert sum_even([1, 2, 3, 4, 6]) == 12",
              hidden: false,
            },
            {
              name: "returns zero with no evens",
              code: "assert sum_even([1, 3, 5]) == 0",
              hidden: false,
            },
            {
              name: "handles negative evens",
              code: "assert sum_even([-2, 3, -4]) == -6",
              hidden: false,
            },
            {
              name: "does not modify the input",
              code: "values = [2, 4, 5]\nsum_even(values)\nassert values == [2, 4, 5]",
              hidden: true,
            },
          ],
        },
        {
          slug: "count-vowels",
          title: "Count vowels",
          difficulty: "beginner",
          position: 2,
          instructions:
            'Write `count_vowels(text)` that counts the vowels a, e, i, o, and u in the text. Treat uppercase and lowercase as the same vowel.\n\nExample: count_vowels("Learning") → 3',
          expectedBehavior:
            "Returns an integer count. Consonants, spaces, and punctuation are ignored.",
          starterCode:
            "def count_vowels(text):\n    count = 0\n    # Count vowel characters\n    return count\n",
          hints: [
            "Convert the text to lowercase once before looping.",
            "You can use `if char in \"aeiou\"`.",
            "Update count inside the if branch.",
          ],
          tests: [
            {
              name: "counts mixed-case vowels",
              code: 'assert count_vowels("Learning") == 3',
              hidden: false,
            },
            {
              name: "returns zero without vowels",
              code: 'assert count_vowels("rhythm") == 0',
              hidden: false,
            },
            {
              name: "ignores spaces and punctuation",
              code: 'assert count_vowels("A, e, i!") == 3',
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "lists-and-collections",
      title: "Lists and ordered collections",
      description:
        "Index, slice, iterate, and transform ordered data while avoiding common mutation mistakes.",
      difficulty: "beginner",
      estimatedMinutes: 35,
      position: 5,
      concepts: ["lists"],
      prerequisites: ["loops-and-iteration"],
      objectives: [
        "Access items by index and slice",
        "Add and remove items safely",
        "Build a new list from an existing one",
        "Explain zero-based indexing and negative indexes",
      ],
      content: {
        intro:
          "A list is an ordered, mutable collection. Order matters, duplicates are allowed, and positions start at zero.",
        sections: [
          {
            title: "Indexing and slicing",
            paragraphs: [
              "`items[0]` is the first item. Negative indexes count from the end: `items[-1]` is the last item. A slice such as `items[1:3]` includes the start index but not the end index.",
            ],
            code: `languages = ["Python", "JavaScript", "Rust"]\nprint(languages[0])    # Python\nprint(languages[-1])   # Rust\nprint(languages[0:2])  # ['Python', 'JavaScript']`,
          },
          {
            title: "Mutation vs a new list",
            paragraphs: [
              "Methods like `append`, `remove`, and `sort` change the list in place. Methods like `sorted` return a new list. Decide whether callers should see the change.",
            ],
            code: `scores = [72, 90, 61]\nordered = sorted(scores)\nprint(scores)   # [72, 90, 61]\nprint(ordered)  # [61, 72, 90]\nscores.sort(reverse=True)\nprint(scores)   # [90, 72, 61]`,
          },
          {
            title: "Iterating with context",
            paragraphs: [
              "When you need both the position and the value, `enumerate` is clearer than manually tracking an index.",
            ],
            code: `for index, language in enumerate(["Python", "Rust"]):\n    print(index, language)`,
          },
        ],
        keyPoints: [
          "Lists are ordered and mutable.",
          "Indexes start at 0; negative indexes count from the end.",
          "Slices exclude the end index.",
          "Know whether a method mutates the list or returns a new one.",
        ],
      },
      exercises: [
        {
          slug: "find-largest",
          title: "Find the largest value",
          difficulty: "beginner",
          position: 1,
          instructions:
            "Write `largest_number(numbers)` that returns the largest number in a non-empty list. Use a loop rather than the built-in max().\n\nIf the list is empty, return None.",
          expectedBehavior:
            "Returns the largest numeric value, or None for an empty list.",
          starterCode:
            "def largest_number(numbers):\n    if not numbers:\n        return None\n    largest = numbers[0]\n    # Compare the remaining values\n    return largest\n",
          hints: [
            "Start with the first item as your current largest.",
            "Loop over the remaining items (or all of them).",
            "Replace largest when the current item is greater.",
            "The empty-list case is already handled for you.",
          ],
          tests: [
            {
              name: "finds the largest in a mixed list",
              code: "assert largest_number([3, 9, 2, 7]) == 9",
              hidden: false,
            },
            {
              name: "handles negative values",
              code: "assert largest_number([-8, -3, -12]) == -3",
              hidden: false,
            },
            {
              name: "returns None for an empty list",
              code: "assert largest_number([]) is None",
              hidden: false,
            },
            {
              name: "handles a single item",
              code: "assert largest_number([42]) == 42",
              hidden: true,
            },
          ],
        },
        {
          slug: "remove-duplicates",
          title: "Remove duplicates in order",
          difficulty: "beginner",
          position: 2,
          instructions:
            "Write `dedupe(items)` that returns a new list with duplicates removed while preserving first-seen order.\n\nExample: dedupe([\"b\", \"a\", \"b\", \"c\", \"a\"]) → [\"b\", \"a\", \"c\"]\n\nDo not modify the input list.",
          expectedBehavior:
            "Returns a new list with the first occurrence of each value in its original position.",
          starterCode:
            "def dedupe(items):\n    result = []\n    # Build a new, duplicate-free list\n    return result\n",
          hints: [
            "Loop over the input and decide whether each item is already in result.",
            "The in operator checks membership in a list.",
            "Append only when the item is not already present.",
            "Return the new list, not the original.",
          ],
          tests: [
            {
              name: "removes duplicates in first-seen order",
              code: 'assert dedupe(["b", "a", "b", "c", "a"]) == ["b", "a", "c"]',
              hidden: false,
            },
            {
              name: "leaves a unique list unchanged",
              code: "assert dedupe([1, 2, 3]) == [1, 2, 3]",
              hidden: false,
            },
            {
              name: "does not modify the input",
              code: "values = [1, 1, 2]\ndedupe(values)\nassert values == [1, 1, 2]",
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "dictionaries-and-lookups",
      title: "Dictionaries and lookups",
      description:
        "Represent related facts as key-value pairs and count repeating values safely.",
      difficulty: "intermediate",
      estimatedMinutes: 35,
      position: 6,
      concepts: ["dictionaries"],
      prerequisites: ["lists-and-collections"],
      objectives: [
        "Read and update dictionary entries",
        "Avoid KeyError with get or membership checks",
        "Count frequencies with a dictionary",
        "Explain why keys must be unique",
      ],
      content: {
        intro:
          "A dictionary maps unique keys to values. It is the right tool when you need to look something up by name or identifier rather than by position.",
        sections: [
          {
            title: "Reading and writing",
            paragraphs: [
              "Use square brackets to read or write a key. Reading a missing key raises a KeyError. `get(key, default)` returns a default instead.",
            ],
            code: `stock = {"pens": 12, "paper": 4}\nprint(stock["pens"])            # 12\nprint(stock.get("ink", 0))      # 0\nstock["ink"] = 7\nstock["pens"] += 1`,
          },
          {
            title: "Counting pattern",
            paragraphs: [
              "A frequency table starts empty. For each item, read the current count with a default of 0, then write the incremented value back.",
            ],
            code: `counts = {}\nfor word in ["to", "be", "to"]:\n    counts[word] = counts.get(word, 0) + 1\nprint(counts)  # {'to': 2, 'be': 1}`,
          },
          {
            title: "Iterating dictionaries",
            paragraphs: [
              "Looping over a dictionary yields its keys. Use `.items()` when you need key-value pairs. Insertion order is preserved in modern Python.",
            ],
            code: `scores = {"Ada": 95, "Grace": 91}\nfor name, score in scores.items():\n    print(f"{name}: {score}")`,
          },
        ],
        keyPoints: [
          "Keys are unique and must be hashable.",
          "Use get() when a missing key is expected.",
          "A dictionary is ideal for lookups and frequency counts.",
          "Loop with .items() for keys and values together.",
        ],
      },
      exercises: [
        {
          slug: "word-frequencies",
          title: "Count word frequencies",
          difficulty: "intermediate",
          position: 1,
          instructions:
            "Write `word_frequencies(text)` that returns a dictionary mapping each word to its count.\n\nRules:\n• Split on whitespace.\n• Convert words to lowercase.\n• Strip the punctuation characters . , ! ? : ; from both ends of each word.\n• Ignore empty strings after cleaning.\n\nExample: word_frequencies(\"To be, to BE!\") → {\"to\": 2, \"be\": 2}",
          expectedBehavior:
            "Returns a dictionary of cleaned, lowercased words and their counts.",
          starterCode:
            "def word_frequencies(text):\n    counts = {}\n    # Count cleaned words\n    return counts\n",
          hints: [
            "Use text.lower().split() to get lowercase words.",
            "String strip(chars) can remove several characters from both ends.",
            "Use counts.get(word, 0) + 1 to update the count.",
            "Skip a word when its cleaned form is empty.",
          ],
          tests: [
            {
              name: "counts repeated words",
              code: 'assert word_frequencies("to be, to BE!") == {"to": 2, "be": 2}',
              hidden: false,
            },
            {
              name: "strips punctuation from edges",
              code: 'assert word_frequencies("Hello, hello.") == {"hello": 2}',
              hidden: false,
            },
            {
              name: "returns an empty dictionary for blank input",
              code: 'assert word_frequencies("   ") == {}',
              hidden: true,
            },
          ],
        },
        {
          slug: "inventory-total",
          title: "Total an inventory",
          difficulty: "intermediate",
          position: 2,
          instructions:
            "Write `inventory_value(prices, quantities)` that returns the total value of an inventory.\n\nBoth arguments are dictionaries keyed by item name. Only items present in both dictionaries count. The result is the sum of price × quantity for those items.\n\nExample:\ninventory_value({\"pen\": 2.5, \"book\": 10}, {\"pen\": 4, \"book\": 1}) → 20.0",
          expectedBehavior:
            "Returns a number; items missing from either dictionary are skipped.",
          starterCode:
            "def inventory_value(prices, quantities):\n    total = 0.0\n    # Sum price * quantity for shared items\n    return total\n",
          hints: [
            "Loop over the keys of one dictionary.",
            "Check whether each item also exists in the other dictionary.",
            "Read both values with square brackets once you know both exist.",
            "Add price * quantity to total.",
          ],
          tests: [
            {
              name: "totals shared items",
              code: 'assert inventory_value({"pen": 2.5, "book": 10}, {"pen": 4, "book": 1}) == 20.0',
              hidden: false,
            },
            {
              name: "skips items missing from quantities",
              code: 'assert inventory_value({"pen": 2, "ink": 5}, {"pen": 3}) == 6',
              hidden: false,
            },
            {
              name: "returns zero with no shared items",
              code: 'assert inventory_value({"pen": 2}, {"book": 3}) == 0',
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "functions-and-parameters",
      title: "Functions, parameters, and reuse",
      description:
        "Design small functions with clear inputs, return values, defaults, and deliberate errors.",
      difficulty: "intermediate",
      estimatedMinutes: 40,
      position: 7,
      concepts: ["functions", "problem-decomposition"],
      prerequisites: ["dictionaries-and-lookups"],
      objectives: [
        "Define a function with parameters and a return value",
        "Use default parameter values",
        "Raise ValueError for invalid input",
        "Split a larger problem into named helpers",
      ],
      content: {
        intro:
          "Functions turn a repeated idea into a named piece of behavior. A good function has a clear job, accepts the data it needs, and returns a useful result instead of hiding output in print.",
        sections: [
          {
            title: "Parameters are inputs",
            paragraphs: [
              "Parameters are names the function uses for the values passed by the caller. Return sends a value back to the caller. A function without an explicit return returns None.",
            ],
            code: `def area(width, height):\n    return width * height\n\nprint(area(3, 4))  # 12`,
          },
          {
            title: "Defaults",
            paragraphs: [
              "A default makes an argument optional. Put parameters with defaults after parameters without them. Avoid mutable defaults such as [] because the same object is reused across calls.",
            ],
            code: `def greet(name, punctuation="!"):\n    return f"Hello, {name}{punctuation}"\n\nprint(greet("Ada"))       # Hello, Ada!\nprint(greet("Ada", "."))  # Hello, Ada.`,
          },
          {
            title: "Validate deliberately",
            paragraphs: [
              "When a function receives input it cannot sensibly process, raise a specific error with a helpful message. This makes the contract clear and prevents a confusing failure later.",
            ],
            code: `def percentage(part, whole):\n    if whole == 0:\n        raise ValueError("whole must not be zero")\n    return part / whole * 100`,
          },
        ],
        keyPoints: [
          "A return value is easier to test than printed output.",
          "Default parameters make inputs optional.",
          "Validate inputs where the function can detect a real problem.",
          "Small helpers with clear names make decomposition possible.",
        ],
      },
      exercises: [
        {
          slug: "apply-discount",
          title: "Apply a discount",
          difficulty: "intermediate",
          position: 1,
          instructions:
            'Write `apply_discount(price, percent)` that returns the discounted price, rounded to two decimal places.\n\nRules:\n• price must be at least 0, otherwise raise ValueError.\n• percent must be between 0 and 100 inclusive, otherwise raise ValueError.\n• A 0 percent discount returns the original price (rounded).\n\nExample: apply_discount(80, 25) → 60.0',
          expectedBehavior:
            "Returns a float rounded to two decimals; invalid inputs raise ValueError.",
          starterCode:
            'def apply_discount(price, percent):\n    # Validate, calculate, and return\n    return price\n',
          hints: [
            "Validate price first, then percent.",
            "The multiplier is 1 - percent / 100.",
            "Use round(value, 2) for two decimals.",
            "Raise ValueError(\"message\") rather than returning a string.",
          ],
          tests: [
            {
              name: "applies a normal discount",
              code: "assert apply_discount(80, 25) == 60.0",
              hidden: false,
            },
            {
              name: "rounds to two decimals",
              code: "assert apply_discount(10, 33.333) == 6.67",
              hidden: false,
            },
            {
              name: "rejects invalid percentages",
              code: "for bad in (-1, 101):\n    try:\n        apply_discount(10, bad)\n    except ValueError:\n        pass\n    else:\n        raise AssertionError(f\"expected ValueError for {bad}\")",
              hidden: false,
            },
            {
              name: "rejects a negative price",
              code: "try:\n    apply_discount(-1, 10)\nexcept ValueError:\n    pass\nelse:\n    raise AssertionError(\"expected ValueError\")",
              hidden: true,
            },
          ],
        },
        {
          slug: "safe-average",
          title: "Average with a default",
          difficulty: "intermediate",
          position: 2,
          instructions:
            "Write `average(values, default=0.0)` that returns the arithmetic mean of a non-empty list of numbers. When the list is empty, return the default.\n\nDo not use statistics.mean.",
          expectedBehavior:
            "Returns sum(values) / len(values), or default when values is empty.",
          starterCode:
            "def average(values, default=0.0):\n    # Return the mean or the default\n    return default\n",
          hints: [
            "Check for an empty list before dividing.",
            "The sum of values is sum(values).",
            "The count is len(values).",
            "The caller may pass a different default value; use the parameter.",
          ],
          tests: [
            {
              name: "averages a normal list",
              code: "assert average([2, 4, 6]) == 4",
              hidden: false,
            },
            {
              name: "uses the default for an empty list",
              code: "assert average([]) == 0.0",
              hidden: false,
            },
            {
              name: "respects a custom default",
              code: "assert average([], default=-1) == -1",
              hidden: false,
            },
            {
              name: "handles floats",
              code: "assert abs(average([0.5, 1.5]) - 1.0) < 1e-9",
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "debugging-and-errors",
      title: "Debugging and reading errors",
      description:
        "Use tracebacks, small experiments, and boundary tests to find the real cause of a bug.",
      difficulty: "intermediate",
      estimatedMinutes: 40,
      position: 8,
      concepts: ["debugging", "exceptions"],
      prerequisites: ["functions-and-parameters"],
      objectives: [
        "Read a traceback from the last line upward",
        "Distinguish a symptom from its cause",
        "Test boundary cases such as empty input and zero",
        "Fix a bug without breaking existing behavior",
      ],
      content: {
        intro:
          "Debugging is a controlled investigation. Read the error, locate the failing line, form one hypothesis, and test it. Guessing repeatedly without evidence usually adds bugs.",
        sections: [
          {
            title: "Read the traceback",
            paragraphs: [
              "Tracebacks read from the bottom up: the final line names the exception, and the frame above it shows the line that raised it. The first useful clue is often the exception type.",
              "`TypeError` usually means a value has the wrong type. `NameError` means a name was used before assignment. `IndexError` means an index is outside the sequence.",
            ],
            code: `def double(value):\n    return value * 2\n\ndouble("3")  # '33' — valid Python, likely the wrong intent\ndouble([1])  # [1, 1]\n`,
          },
          {
            title: "Test the boundaries",
            paragraphs: [
              "Bugs often hide at the edges: empty lists, zero, one item, negative values, and missing keys. Write the smallest input that reproduces the problem.",
            ],
            code: `def average(values):\n    return sum(values) / len(values)\n\n# average([]) raises ZeroDivisionError`,
          },
          {
            title: "Fix the cause",
            paragraphs: [
              "If the error is division by zero, decide what the function should mean for an empty list. Returning a default, raising a clear error, or requiring non-empty input are all valid—but the choice must be deliberate.",
            ],
            code: `def average(values):\n    if not values:\n        return None\n    return sum(values) / len(values)`,
          },
        ],
        keyPoints: [
          "Start from the exception type and the line that raised it.",
          "Reproduce with the smallest input.",
          "Check boundaries before adding broad try/except blocks.",
          "Fix the cause, not the visible symptom.",
        ],
      },
      exercises: [
        {
          slug: "fix-the-average",
          title: "Fix the average",
          difficulty: "intermediate",
          position: 1,
          instructions:
            "The starter function handles empty input, but it returns the wrong value for that case.\n\nMake `average(values)` return the mean for a non-empty list and return None for an empty list. Do not use statistics.mean.\n\nKeep the existing behavior for non-empty lists. A list containing zeros is not empty and should be averaged normally.",
          expectedBehavior:
            "average([2, 4, 6]) returns 4; average([]) returns None; no exception is raised.",
          starterCode:
            "def average(values):\n    if not values:\n        return 0\n    return sum(values) / len(values)\n",
          hints: [
            "Run the starter code mentally with an empty list. What does it return?",
            "The instruction says None, not 0, for an empty list.",
            "Only one line in the early return needs to change.",
          ],
          tests: [
            {
              name: "averages a normal list",
              code: "assert average([2, 4, 6]) == 4",
              hidden: false,
            },
            {
              name: "returns None for an empty list",
              code: "assert average([]) is None",
              hidden: false,
            },
            {
              name: "handles a list containing zero",
              code: "assert average([0, 0]) == 0",
              hidden: false,
            },
            {
              name: "handles negative values",
              code: "assert average([-2, 2]) == 0",
              hidden: true,
            },
          ],
        },
        {
          slug: "first-item",
          title: "Guard a lookup",
          difficulty: "intermediate",
          position: 2,
          instructions:
            "Write `first_item(items, fallback=None)` that returns the first item of a sequence, or fallback when the sequence is empty. Do not let an IndexError escape.",
          expectedBehavior:
            "Returns items[0] when present and fallback otherwise.",
          starterCode:
            "def first_item(items, fallback=None):\n    # Return the first item or the fallback\n    return items[0]\n",
          hints: [
            "Use a truthiness check or len(items) == 0.",
            "Check before indexing.",
            "Return fallback from the empty branch.",
          ],
          tests: [
            {
              name: "returns the first item",
              code: "assert first_item([3, 4]) == 3",
              hidden: false,
            },
            {
              name: "returns None by default",
              code: "assert first_item([]) is None",
              hidden: false,
            },
            {
              name: "respects a custom fallback",
              code: 'assert first_item([], "empty") == "empty"',
              hidden: false,
            },
            {
              name: "does not treat zero as missing",
              code: "assert first_item([0, 1]) == 0",
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "files-and-exceptions",
      title: "Files and deliberate exceptions",
      description:
        "Read and write files safely, use context managers, and handle failures without hiding them.",
      difficulty: "intermediate",
      estimatedMinutes: 45,
      position: 9,
      concepts: ["files", "exceptions"],
      prerequisites: ["debugging-and-errors"],
      objectives: [
        "Open a file with a with statement",
        "Read lines and convert text to numbers",
        "Raise and catch specific exceptions",
        "Avoid broad except blocks that hide bugs",
      ],
      content: {
        intro:
          "Files let a program outlive a single run. Exceptions are how Python reports that an operation could not be completed. Used well, they make failures explicit rather than silent.",
        sections: [
          {
            title: "Context managers",
            paragraphs: [
              "A `with open(...) as file` block closes the file even if an error occurs. Use an explicit encoding for text files so behavior is predictable across systems.",
            ],
            code: `with open("scores.txt", "w", encoding="utf-8") as file:\n    file.write("10\\n20\\n")\n\nwith open("scores.txt", encoding="utf-8") as file:\n    for line in file:\n        print(line.strip())`,
          },
          {
            title: "Catch what you can handle",
            paragraphs: [
              "Catch the narrow exception you expect and can recover from. If you cannot do anything useful, let the error propagate with context.",
            ],
            code: `def safe_divide(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return None\n\nprint(safe_divide(6, 0))  # None`,
          },
          {
            title: "Raise with meaning",
            paragraphs: [
              "Use `raise ValueError(\"message\")` when a caller supplies data that violates the function's contract. Include enough detail to diagnose the problem without exposing secrets.",
            ],
            code: `def require_positive(value):\n    if value <= 0:\n        raise ValueError("value must be greater than zero")\n    return value`,
          },
        ],
        keyPoints: [
          "with open(...) guarantees the file is closed.",
          "Catch specific exceptions and only when you can recover.",
          "Use raise to enforce a function's contract.",
          "File data is text until you convert it.",
        ],
      },
      exercises: [
        {
          slug: "safe-divide",
          title: "Handle division by zero",
          difficulty: "intermediate",
          position: 1,
          instructions:
            "Write `safe_divide(a, b)` that returns a / b. When b is zero, return None instead of raising. Do not catch unrelated exceptions.\n\nNote: the result may be an int or a float.",
          expectedBehavior:
            "safe_divide(6, 3) is 2.0; safe_divide(1, 0) is None.",
          starterCode:
            "def safe_divide(a, b):\n    # Return the quotient or None\n    return a / b\n",
          hints: [
            "Use try/except around the division.",
            "Catch ZeroDivisionError specifically.",
            "Return None inside the except block.",
          ],
          tests: [
            {
              name: "divides two numbers",
              code: "assert safe_divide(6, 3) == 2",
              hidden: false,
            },
            {
              name: "returns None for zero divisor",
              code: "assert safe_divide(1, 0) is None",
              hidden: false,
            },
            {
              name: "handles negative values",
              code: "assert safe_divide(-9, 3) == -3",
              hidden: false,
            },
            {
              name: "does not swallow TypeErrors",
              code: "try:\n    safe_divide('a', 2)\nexcept TypeError:\n    pass\nelse:\n    raise AssertionError('expected TypeError')",
              hidden: true,
            },
          ],
        },
        {
          slug: "sum-file-numbers",
          title: "Sum numbers from a file",
          difficulty: "intermediate",
          position: 2,
          instructions:
            "Write `sum_file_numbers(path)` that opens a UTF-8 text file, reads one number per line, and returns their total.\n\n• Ignore blank lines.\n• Let a ValueError propagate if a non-blank line is not a number.\n• Use a with statement so the file always closes.\n\nThere are no sample files in the editor; the tests create temporary files.",
          expectedBehavior:
            "Returns an int or float total; blank lines are ignored; invalid lines raise ValueError.",
          starterCode:
            "def sum_file_numbers(path):\n    total = 0\n    # Open the file and add each non-blank line\n    return total\n",
          hints: [
            "Use with open(path, encoding=\"utf-8\") as file.",
            "Loop over the file object to get lines.",
            "Strip each line and skip it if empty.",
            "Convert with float(line) and add to total.",
          ],
          tests: [
            {
              name: "sums numbers",
              code: "import tempfile, os\nfd, path = tempfile.mkstemp(text=True)\ntry:\n    os.write(fd, b'2\\n3\\n4\\n')\n    os.close(fd)\n    assert sum_file_numbers(path) == 9\nfinally:\n    try:\n        os.close(fd)\n    except OSError:\n        pass\n    os.remove(path)",
              hidden: false,
            },
            {
              name: "ignores blank lines",
              code: "import tempfile, os\nfd, path = tempfile.mkstemp(text=True)\ntry:\n    os.write(fd, b'2\\n\\n3\\n')\n    os.close(fd)\n    assert sum_file_numbers(path) == 5\nfinally:\n    try:\n        os.close(fd)\n    except OSError:\n        pass\n    os.remove(path)",
              hidden: false,
            },
            {
              name: "returns zero for an empty file",
              code: "import tempfile, os\nfd, path = tempfile.mkstemp(text=True)\ntry:\n    os.close(fd)\n    assert sum_file_numbers(path) == 0\nfinally:\n    os.remove(path)",
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "modules-and-reuse",
      title: "Modules and reusable code",
      description:
        "Group related functions, separate execution from import, and expose a small public surface.",
      difficulty: "intermediate",
      estimatedMinutes: 30,
      position: 10,
      concepts: ["modules", "functions"],
      prerequisites: ["files-and-exceptions"],
      objectives: [
        "Explain what happens when a module is imported",
        "Use the if __name__ == \"__main__\" guard",
        "Keep module-level constants meaningful",
        "Design a small set of public helpers",
      ],
      content: {
        intro:
          "A module is a Python file that can be imported. Importing runs the file's top-level code once, then makes its names available to the importer.",
        sections: [
          {
            title: "Importing runs code",
            paragraphs: [
              "Top-level statements execute on import. That is useful for defining constants and functions, but dangerous for side effects such as printing or reading command-line arguments. Put those behind a function and guard the call.",
            ],
            code: `# pricing.py\nTAX_RATE = 0.2\n\ndef with_tax(price):\n    return round(price * (1 + TAX_RATE), 2)\n\nif __name__ == "__main__":\n    print(with_tax(10))`,
          },
          {
            title: "A small public surface",
            paragraphs: [
              "Helpers that are only used inside a module can start with an underscore. `__all__` can document the names intended for importers, though it does not enforce privacy.",
            ],
            code: `__all__ = ["with_tax", "format_price"]`,
          },
          {
            title: "Import styles",
            paragraphs: [
              "`import pricing` keeps the module namespace. `from pricing import with_tax` imports one name. Prefer explicit imports when the origin of a name matters.",
            ],
            code: `import pricing\nprint(pricing.with_tax(10))\n\nfrom pricing import with_tax\nprint(with_tax(20))`,
          },
        ],
        keyPoints: [
          "Importing a module executes its top-level code once.",
          "Use if __name__ == \"__main__\" for script-only behavior.",
          "Module constants should be meaningful and documented.",
          "Prefer explicit imports when clarity matters.",
        ],
      },
      exercises: [
        {
          slug: "price-helper",
          title: "A reusable price helper",
          difficulty: "intermediate",
          position: 1,
          instructions:
            'Define a module-level constant `TAX_RATE = 0.2` and a function `with_tax(price)` that returns the price including tax, rounded to two decimals.\n\nThen define `format_price(price)` that returns a string such as "$12.00".\n\nAssume price is a non-negative number. Do not print anything at module level.',
          expectedBehavior:
            "TAX_RATE is 0.2; with_tax(10) is 12.0; format_price(12) is \"$12.00\".",
          starterCode:
            "# Define TAX_RATE, with_tax, and format_price\n",
          hints: [
            "Define TAX_RATE near the top of the file.",
            "Multiply price by (1 + TAX_RATE) before rounding.",
            "An f-string can format two decimals: f\"${price:.2f}\".",
            "Call format_price with the result of with_tax in your own experiment.",
          ],
          tests: [
            {
              name: "defines the tax rate",
              code: "assert TAX_RATE == 0.2",
              hidden: false,
            },
            {
              name: "adds tax and rounds",
              code: "assert with_tax(10) == 12.0\nassert with_tax(9.99) == 11.99",
              hidden: false,
            },
            {
              name: "formats a price",
              code: 'assert format_price(12) == "$12.00"\nassert format_price(7.5) == "$7.50"',
              hidden: false,
            },
            {
              name: "does not mutate the argument",
              code: "value = 10.0\nwith_tax(value)\nassert value == 10.0",
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "classes-and-objects",
      title: "Classes and objects",
      description:
        "Model state and behavior with classes, constructors, methods, and clear invariants.",
      difficulty: "advanced",
      estimatedMinutes: 50,
      position: 11,
      concepts: ["classes"],
      prerequisites: ["modules-and-reuse"],
      objectives: [
        "Define a class with __init__ and methods",
        "Keep an invariant true across mutations",
        "Distinguish instance state from class state",
        "Use properties or methods to expose behavior",
      ],
      content: {
        intro:
          "A class is a blueprint for objects that share state and behavior. Use one when a group of values and the operations on them belong together, not merely to group unrelated functions.",
        sections: [
          {
            title: "State and behavior",
            paragraphs: [
              "`__init__` initializes a new instance. `self` refers to the instance being operated on. Methods can read and change instance attributes.",
            ],
            code: `class Counter:\n    def __init__(self, start=0):\n        self.value = start\n\n    def increment(self, amount=1):\n        self.value += amount\n\ncounter = Counter()\ncounter.increment()\nprint(counter.value)  # 1`,
          },
          {
            title: "Protect invariants",
            paragraphs: [
              "An invariant is something that should always be true, such as a bank balance never being negative after a withdrawal. Validation belongs in the method that could break it.",
            ],
            code: `class Account:\n    def __init__(self, balance=0):\n        if balance < 0:\n            raise ValueError("balance cannot be negative")\n        self.balance = balance\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            raise ValueError("insufficient funds")\n        self.balance -= amount`,
          },
        ],
        keyPoints: [
          "Classes combine state with the behavior that protects it.",
          "__init__ runs when an instance is created.",
          "Validate in the method that could break an invariant.",
          "Prefer the simplest tool; not everything needs a class.",
        ],
      },
      exercises: [
        {
          slug: "bank-account",
          title: "Implement a bank account",
          difficulty: "advanced",
          position: 1,
          instructions:
            "Implement a class `BankAccount`:\n\n• `BankAccount(initial_balance=0)` stores the balance.\n• A negative initial balance raises ValueError.\n• `deposit(amount)` adds a positive amount, otherwise raises ValueError.\n• `withdraw(amount)` subtracts a positive amount that does not exceed the balance, otherwise raises ValueError.\n• `balance` is readable as an attribute.\n\nAfter any operation, the balance must be a number >= 0.",
          expectedBehavior:
            "Valid operations update the balance; invalid operations raise ValueError and leave the balance unchanged.",
          starterCode:
            "class BankAccount:\n    def __init__(self, initial_balance=0):\n        self.balance = initial_balance\n\n    def deposit(self, amount):\n        pass\n\n    def withdraw(self, amount):\n        pass\n",
          hints: [
            "Validate the initial balance before assigning it.",
            "Deposit should reject zero and negative amounts.",
            "Withdraw should check both positive amount and sufficient balance.",
            "Only change self.balance after all validation has passed.",
          ],
          tests: [
            {
              name: "records deposits",
              code: "account = BankAccount(10)\naccount.deposit(5)\nassert account.balance == 15",
              hidden: false,
            },
            {
              name: "records withdrawals",
              code: "account = BankAccount(10)\naccount.withdraw(4)\nassert account.balance == 6",
              hidden: false,
            },
            {
              name: "rejects overdrafts",
              code: "account = BankAccount(10)\ntry:\n    account.withdraw(11)\nexcept ValueError:\n    pass\nelse:\n    raise AssertionError('expected ValueError')\nassert account.balance == 10",
              hidden: false,
            },
            {
              name: "rejects a negative opening balance",
              code: "try:\n    BankAccount(-1)\nexcept ValueError:\n    pass\nelse:\n    raise AssertionError('expected ValueError')",
              hidden: true,
            },
            {
              name: "rejects non-positive deposits",
              code: "account = BankAccount(10)\nfor amount in (0, -5):\n    try:\n        account.deposit(amount)\n    except ValueError:\n        pass\n    else:\n        raise AssertionError('expected ValueError')\nassert account.balance == 10",
              hidden: true,
            },
          ],
        },
      ],
    },
    {
      slug: "practical-project",
      title: "Practical project: an expense report",
      description:
        "Combine functions, collections, validation, and formatting into one small, testable report builder.",
      difficulty: "advanced",
      estimatedMinutes: 55,
      position: 12,
      concepts: ["problem-decomposition", "dictionaries", "functions", "lists"],
      prerequisites: ["classes-and-objects"],
      objectives: [
        "Translate a written specification into testable behavior",
        "Validate records before aggregating them",
        "Build a result from several small steps",
        "Keep output separate from calculation",
      ],
      content: {
        intro:
          "This project combines the path so far. You will build a calculation function first, then a formatting function that depends on it. That separation makes each piece easier to test.",
        sections: [
          {
            title: "Read the specification twice",
            paragraphs: [
              "Before writing code, identify the inputs, the outputs, and the edge cases. Here each record is a dictionary with a category and an amount. The report needs a total, a per-category total, and a count.",
            ],
          },
          {
            title: "Calculate, then format",
            paragraphs: [
              "A calculation function should return data, not a paragraph of text. A formatter can then turn the data into a human-readable string. Keeping them separate means the formatter can change without breaking the math.",
            ],
          },
          {
            title: "Test the edges",
            paragraphs: [
              "What happens with an empty list? A zero amount? A negative amount? Decide deliberately, document the rule in the function, and test it.",
            ],
          },
        ],
        keyPoints: [
          "Write behavior in small functions with clear contracts.",
          "Validate input close to where it is used.",
          "Calculations and presentation are separate responsibilities.",
          "Test empty and boundary inputs.",
        ],
      },
      exercises: [
        {
          slug: "expense-report",
          title: "Build an expense report",
          difficulty: "advanced",
          position: 1,
          instructions:
            'Write `build_report(records)`.\n\nEach record is a dictionary: {"category": str, "amount": number}.\n\nReturn a dictionary with:\n• "total": sum of all amounts (rounded to 2 decimals)\n• "by_category": a dictionary mapping category to its rounded total\n• "count": number of records\n\nRules:\n• An empty list returns {"total": 0, "by_category": {}, "count": 0}.\n• A negative amount raises ValueError.\n• A missing category or amount key raises ValueError with a clear message.\n• Amounts may be int or float.',
          expectedBehavior:
            "Returns a summary dictionary; invalid records raise ValueError before any partial result is returned.",
          starterCode:
            "def build_report(records):\n    # Return total, by_category, and count\n    return {\"total\": 0, \"by_category\": {}, \"count\": 0}\n",
          hints: [
            "Validate every record before you aggregate anything.",
            "Use a dictionary named by_category and .get(category, 0).",
            "Round with round(value, 2) at the end.",
            "Return count as len(records).",
          ],
          tests: [
            {
              name: "builds an empty report",
              code: 'assert build_report([]) == {"total": 0, "by_category": {}, "count": 0}',
              hidden: false,
            },
            {
              name: "totals and groups records",
              code: 'result = build_report([{"category": "books", "amount": 10.5}, {"category": "books", "amount": 2}, {"category": "food", "amount": 4}])\nassert result["total"] == 16.5\nassert result["by_category"] == {"books": 12.5, "food": 4}\nassert result["count"] == 3',
              hidden: false,
            },
            {
              name: "rejects negative amounts",
              code: 'try:\n    build_report([{"category": "books", "amount": -1}])\nexcept ValueError:\n    pass\nelse:\n    raise AssertionError("expected ValueError")',
              hidden: false,
            },
            {
              name: "rejects incomplete records",
              code: 'for bad in ({"category": "books"}, {"amount": 1}):\n    try:\n        build_report([bad])\n    except ValueError:\n        pass\n    else:\n        raise AssertionError("expected ValueError")',
              hidden: true,
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Initial assessment. Question keys are seeded separately and are never sent
 * to the browser. `difficulty` is 1 (foundation) to 3 (stretch).
 */
export const assessment = {
  slug: "python-initial",
  title: "Python starting point",
  description:
    "A short adaptive check across values, control flow, collections, functions, and debugging. It is used to choose a starting point, not to grade you.",
  questions: [
    {
      key: "q-values",
      concept: "variables",
      type: "multiple_choice",
      difficulty: 1,
      prompt:
        "Which line creates a variable named score holding the integer 10?",
      options: [
        { id: "a", text: 'score = "10"' },
        { id: "b", text: "score = 10" },
        { id: "c", text: "10 = score" },
        { id: "d", text: "int score = 10" },
      ],
      answer: { optionId: "b" },
      explanation:
        "Assignment puts the name on the left and the value on the right. Quotation marks would make it a string.",
    },
    {
      key: "q-types",
      concept: "data-types",
      type: "multiple_choice",
      difficulty: 1,
      prompt: "What is the type of the value produced by 7 / 2?",
      options: [
        { id: "a", text: "int" },
        { id: "b", text: "float" },
        { id: "c", text: "str" },
        { id: "d", text: "bool" },
      ],
      answer: { optionId: "b" },
      explanation:
        "In Python 3, true division with / always produces a float, even when both operands are integers. Use // for floor division.",
    },
    {
      key: "q-strings",
      concept: "strings",
      type: "code_output",
      difficulty: 1,
      prompt: 'What does this program print?\n\nprint("  Ada  ".strip().upper())',
      answer: { value: "ADA" },
      acceptedAnswers: ["ADA"],
      explanation:
        "strip() removes surrounding whitespace, then upper() changes the remaining letters to uppercase.",
    },
    {
      key: "q-booleans",
      concept: "booleans",
      type: "multiple_choice",
      difficulty: 2,
      prompt:
        "Which expression is True when x is between 1 and 10, including both endpoints?",
      options: [
        { id: "a", text: "x > 1 or x < 10" },
        { id: "b", text: "1 <= x <= 10" },
        { id: "c", text: "x >= 1 and <= 10" },
        { id: "d", text: "x >= 1 or x <= 10" },
      ],
      answer: { optionId: "b" },
      explanation:
        "Python supports chained comparisons, so 1 <= x <= 10 is both correct and readable. An or condition would also be true outside the range.",
    },
    {
      key: "q-conditionals",
      concept: "conditionals",
      type: "code_output",
      difficulty: 2,
      prompt:
        'What does this program print?\n\nscore = 72\nif score >= 90:\n    print("A")\nelif score >= 60:\n    print("B")\nelse:\n    print("C")',
      answer: { value: "B" },
      acceptedAnswers: ["B"],
      explanation:
        "The first false condition is skipped. The second is true, so B prints and the else branch never runs.",
    },
    {
      key: "q-loops",
      concept: "loops",
      type: "code_output",
      difficulty: 2,
      prompt:
        "What is the final value of total?\n\ntotal = 0\nfor n in range(1, 5):\n    total += n\n\nEnter just the number.",
      answer: { value: "10" },
      acceptedAnswers: ["10", "10.0"],
      explanation:
        "range(1, 5) produces 1, 2, 3, 4. Their sum is 10. The stop value is excluded.",
    },
    {
      key: "q-lists",
      concept: "lists",
      type: "multiple_choice",
      difficulty: 2,
      prompt: "What is values[-1] after values = [4, 8, 15]?",
      options: [
        { id: "a", text: "4" },
        { id: "b", text: "8" },
        { id: "c", text: "15" },
        { id: "d", text: "An IndexError" },
      ],
      answer: { optionId: "c" },
      explanation:
        "A negative index counts from the end. -1 is the last item, so the result is 15.",
    },
    {
      key: "q-dicts",
      concept: "dictionaries",
      type: "code_output",
      difficulty: 2,
      prompt:
        'What does this print?\n\nstock = {"pens": 2}\nprint(stock.get("paper", 0) + stock["pens"])',
      answer: { value: "2" },
      acceptedAnswers: ["2"],
      explanation:
        'get("paper", 0) returns the default 0 because the key is missing. 0 + 2 is 2.',
    },
    {
      key: "q-functions",
      concept: "functions",
      type: "multiple_choice",
      difficulty: 3,
      prompt:
        "What does a function return if it has no return statement and reaches its end?",
      options: [
        { id: "a", text: "0" },
        { id: "b", text: "None" },
        { id: "c", text: "An empty string" },
        { id: "d", text: "It raises an error" },
      ],
      answer: { optionId: "b" },
      explanation:
        "Python implicitly returns None when execution reaches the end of a function without a return value.",
    },
    {
      key: "q-debugging",
      concept: "debugging",
      type: "multiple_choice",
      difficulty: 3,
      prompt:
        'A function raises IndexError: list index out of range. What is the most useful first step?',
      options: [
        { id: "a", text: "Wrap the whole program in try/except" },
        { id: "b", text: "Find the line in the traceback and check the list length and index" },
        { id: "c", text: "Add more print statements to every function" },
        { id: "d", text: "Replace the list with a dictionary" },
      ],
      answer: { optionId: "b" },
      explanation:
        "The traceback identifies the failing line. Comparing the index with the sequence length tests the most likely cause directly.",
    },
    {
      key: "q-decomposition",
      concept: "problem-decomposition",
      type: "short_answer",
      difficulty: 3,
      prompt:
        "In one or two sentences, describe how you would break the problem of 'compute a student's average and letter grade' into smaller pieces.",
      answer: {
        keywords: ["average", "grade", "function", "validate", "input"],
        minMatches: 2,
      },
      explanation:
        "A strong answer separates input validation, average calculation, and grade mapping into testable steps. The review of your response is for your own calibration; this question is not auto-graded strictly.",
      selfAssessed: true,
    },
    {
      key: "q-practical",
      concept: "functions",
      type: "code",
      difficulty: 3,
      prompt:
        "Practical check: write a function `count_long_words(text, minimum=5)` that returns how many words have at least `minimum` letters.\n\nSplit on whitespace and compare len(word) to minimum. Example: count_long_words(\"learn by building real things\") → 3",
      starterCode:
        "def count_long_words(text, minimum=5):\n    count = 0\n    # Count words with at least minimum letters\n    return count\n",
      answer: {
        tests: [
          {
            name: "counts long words",
            code: 'assert count_long_words("learn by building real things") == 3',
          },
          {
            name: "respects a custom minimum",
            code: 'assert count_long_words("one two three", minimum=4) == 1',
          },
          {
            name: "handles empty text",
            code: 'assert count_long_words("") == 0',
          },
        ],
      },
      explanation:
        "A correct solution loops over text.split(), compares each word length to minimum, and returns the count.",
      optionalIfExecutionUnavailable: true,
    },
  ],
};

/**
 * Recall cards attached to concepts. They are scheduled after a learner
 * passes an exercise, then spaced according to their review quality.
 */
export const reviewCards = [
  {
    key: "rc-variables",
    concept: "variables",
    type: "multiple_choice",
    prompt: "What is the value of x after this code runs?\n\nx = 3\nx = x + 4",
    options: ["3", "4", "7", "It raises an error"],
    answer: { optionId: "2" },
    explanation:
      "The second assignment reads the current value (3), adds 4, and binds x to the result, 7.",
  },
  {
    key: "rc-types",
    concept: "data-types",
    type: "multiple_choice",
    prompt: "Which value is a boolean?",
    options: ['"True"', "1", "True", "0.0"],
    answer: { optionId: "2" },
    explanation:
      "Boolean literals are True and False without quotes. The quoted version is a string.",
  },
  {
    key: "rc-strings",
    concept: "strings",
    type: "code_output",
    prompt: 'What does this print?\n\nprint("ab" + "cd")',
    answer: { value: "abcd" },
    explanation:
      "The + operator joins strings end to end; it does not add them arithmetically.",
  },
  {
    key: "rc-conditionals",
    concept: "conditionals",
    type: "multiple_choice",
    prompt:
      "Which branch runs when the first if condition is false and the elif condition is true?",
    options: [
      "The if branch",
      "The elif branch",
      "The else branch",
      "Both if and elif",
    ],
    answer: { optionId: "1" },
    explanation:
      "Only the first true branch executes. A later elif runs only when all previous conditions were false.",
  },
  {
    key: "rc-loops",
    concept: "loops",
    type: "code_output",
    prompt: "What is the final value of total?\n\ntotal = 0\nfor n in [2, 4, 6]:\n    total += n",
    answer: { value: "12" },
    explanation: "The loop accumulates 2 + 4 + 6, which is 12.",
  },
  {
    key: "rc-lists",
    concept: "lists",
    type: "multiple_choice",
    prompt: "After values = [1, 2, 3], what does values.append(4) do?",
    options: [
      "Returns a new list [1, 2, 3, 4]",
      "Adds 4 to the existing list",
      "Inserts 4 at the start",
      "Raises an error",
    ],
    answer: { optionId: "1" },
    explanation:
      "append mutates the list in place and returns None. The list itself now contains 4 at the end.",
  },
  {
    key: "rc-dicts",
    concept: "dictionaries",
    type: "code_output",
    prompt:
      'What does this print?\n\nd = {"a": 1}\nprint(d.get("b", 9))',
    answer: { value: "9" },
    explanation:
      "The key b is missing, so get returns the provided default, 9.",
  },
  {
    key: "rc-functions",
    concept: "functions",
    type: "multiple_choice",
    prompt: "What is the main advantage of returning a value from a function?",
    options: [
      "The function runs faster",
      "The result can be tested and reused by the caller",
      "It automatically prints the value",
      "It prevents all errors",
    ],
    answer: { optionId: "1" },
    explanation:
      "A returned value is data the caller can test, combine, or store. Printing only produces side effects.",
  },
  {
    key: "rc-debugging",
    concept: "debugging",
    type: "multiple_choice",
    prompt: "Where do you start when reading a Python traceback?",
    options: [
      "The first line of the file",
      "The last line, which names the exception",
      "The middle of the traceback",
      "The editor status bar",
    ],
    answer: { optionId: "1" },
    explanation:
      "The final line names the exception type and message. Work upward to the frame that raised it.",
  },
  {
    key: "rc-exceptions",
    concept: "exceptions",
    type: "multiple_choice",
    prompt: "Which except clause should you usually write?",
    options: [
      "except Exception:",
      "except:",
      "except ZeroDivisionError:",
      "except BaseException:",
    ],
    answer: { optionId: "2" },
    explanation:
      "Catch the specific exception you can handle. Broad handlers hide unexpected bugs.",
  },
  {
    key: "rc-files",
    concept: "files",
    type: "multiple_choice",
    prompt: "Why use with open(...) instead of open(...) alone?",
    options: [
      "It makes the file larger",
      "It closes the file when the block exits, even after an error",
      "It prevents all file errors",
      "It converts the file to JSON",
    ],
    answer: { optionId: "1" },
    explanation:
      "The context manager guarantees cleanup. It does not suppress exceptions or transform content.",
  },
  {
    key: "rc-classes",
    concept: "classes",
    type: "multiple_choice",
    prompt: "What does __init__ do in a Python class?",
    options: [
      "Creates a copy of the class",
      "Initializes a new instance after it is created",
      "Deletes the instance",
      "Imports the class",
    ],
    answer: { optionId: "1" },
    explanation:
      "__init__ runs on a newly created instance so it can set up required state. It is not the constructor call itself.",
  },
];
