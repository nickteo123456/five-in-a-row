-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
    explanation TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    topic VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);

-- Insert 50 Python Control Flow MCQ questions
INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, topic) VALUES
('What keyword is used to create a conditional statement?', 'if', 'when', 'check', 'condition', 0, 'The "if" keyword is used for conditional statements.', 'beginner', 'Control Flow'),
('How do you start an else statement?', 'else:', 'else()', 'else', 'else if', 0, 'The else statement is written as "else:".', 'beginner', 'Control Flow'),
('What does the elif keyword do?', 'Ends if statement', 'Checks additional condition', 'Loops condition', 'Defines function', 1, 'The "elif" keyword checks additional conditions in if statements.', 'beginner', 'Control Flow'),
('Which keyword is used to start a for loop?', 'loop', 'repeat', 'for', 'iterate', 2, 'The "for" keyword is used to start loops.', 'beginner', 'Control Flow'),
('What is the correct syntax for a while loop?', 'while (condition)', 'while condition:', 'while condition', 'while: condition', 1, 'While loops use "while condition:" syntax.', 'beginner', 'Control Flow'),
('What does the break statement do?', 'Pauses the loop', 'Exits the loop', 'Skips an iteration', 'Restarts the loop', 1, 'The break statement exits the current loop.', 'beginner', 'Control Flow'),
('What does the continue statement do?', 'Exits the loop', 'Skips to next iteration', 'Pauses the loop', 'Restarts the loop', 1, 'The continue statement skips to the next iteration.', 'beginner', 'Control Flow'),
('What does the pass statement do?', 'Exits the program', 'Does nothing', 'Skips a loop', 'Raises an error', 1, 'The pass statement is a placeholder that does nothing.', 'beginner', 'Control Flow'),
('How do you write an if statement that checks if x equals 5?', 'if x = 5:', 'if x == 5:', 'if (x = 5):', 'if x equals 5:', 1, 'Use == for comparison and : to start the block.', 'beginner', 'Control Flow'),
('What is the output of: if True: print("Yes")?', 'Yes', 'True', 'No output', 'Error', 0, 'The condition is True, so "Yes" is printed.', 'beginner', 'Control Flow'),
('Can you have multiple elif statements?', 'No', 'Yes', 'Only two', 'Only with else', 1, 'You can have as many elif statements as needed.', 'beginner', 'Control Flow'),
('What happens if no condition is True in if-elif-else?', 'Error occurs', 'Nothing happens', 'else block executes', 'Program exits', 2, 'If no condition is True, the else block executes if present.', 'beginner', 'Control Flow'),
('How many times does "for i in range(5):" loop?', '4 times', '5 times', '6 times', 'Infinite', 1, 'range(5) generates 0,1,2,3,4 - that is 5 numbers.', 'beginner', 'Control Flow'),
('What does "for i in range(1, 4):" generate?', '1, 2, 3', '1, 2, 3, 4', '0, 1, 2, 3', '2, 3, 4', 0, 'range(1, 4) generates numbers from 1 up to (but not including) 4.', 'beginner', 'Control Flow'),
('What is the correct way to iterate over a list?', 'for item of list:', 'for item in list:', 'for item from list:', 'foreach item in list:', 1, 'Use "for item in list:" syntax to iterate over lists.', 'beginner', 'Control Flow'),
('When does a while loop stop?', 'After 10 iterations', 'When condition is False', 'When break is called', 'Both B and C', 3, 'A while loop stops when condition becomes False or break is called.', 'beginner', 'Control Flow'),
('What is an infinite loop?', 'Loop with no code', 'Loop that never ends', 'Loop with break', 'Loop with continue', 1, 'An infinite loop is one whose condition never becomes False.', 'beginner', 'Control Flow'),
('How do you create an infinite loop?', 'while True:', 'while 1:', 'while False:', 'Both A and B', 3, 'Both "while True:" and "while 1:" create infinite loops.', 'beginner', 'Control Flow'),
('What is nested if?', 'if inside if', 'if with elif', 'if with else', 'Multiple ifs', 0, 'Nested if means an if statement inside another if statement.', 'beginner', 'Control Flow'),
('Can you use break in an if statement outside a loop?', 'Yes', 'No', 'Sometimes', 'Only with else', 1, 'break can only be used inside loops, not in standalone if statements.', 'beginner', 'Control Flow'),
('What does "else" do after a for loop?', 'Runs if loop breaks', 'Runs if loop completes normally', 'Always runs', 'Never runs', 1, 'else after a loop runs only if the loop completes without break.', 'beginner', 'Control Flow'),
('Can a for loop have an else clause?', 'No', 'Yes', 'Only while loops can', 'Only if there is break', 1, 'Both for and while loops can have an else clause.', 'beginner', 'Control Flow'),
('What is the output of: for i in range(3): print(i)?', '1 2 3', '0 1 2', '0 1 2 3', '1 2', 1, 'range(3) generates 0, 1, 2.', 'beginner', 'Control Flow'),
('How do you exit nested loops at once?', 'break', 'Use a flag variable', 'continue', 'pass', 1, 'break only exits one loop; use a flag variable to exit nested loops.', 'beginner', 'Control Flow'),
('What is the difference between break and continue?', 'No difference', 'break exits loop, continue skips iteration', 'continue exits loop, break skips iteration', 'break is faster', 1, 'break exits the entire loop, continue just skips the current iteration.', 'beginner', 'Control Flow'),
('Can you have an if without else?', 'No', 'Yes', 'Only with elif', 'Must have pass', 1, 'else is optional in if statements.', 'beginner', 'Control Flow'),
('What happens with: if False: print("Yes")?', 'Prints Yes', 'Prints False', 'No output', 'Error', 2, 'The condition is False, so nothing is printed.', 'beginner', 'Control Flow'),
('How do you check multiple conditions with AND?', 'if a && b:', 'if a and b:', 'if a & b:', 'if a, b:', 1, 'Use "and" keyword to check multiple conditions.', 'beginner', 'Control Flow'),
('How do you check multiple conditions with OR?', 'if a || b:', 'if a or b:', 'if a | b:', 'if a; b:', 1, 'Use "or" keyword for OR condition.', 'beginner', 'Control Flow'),
('What does "not" do in: if not condition:?', 'Inverts the condition', 'Checks if condition is None', 'Exits the if', 'Raises error', 0, 'The "not" keyword inverts the boolean value of the condition.', 'beginner', 'Control Flow'),
('Can you use break in a while loop?', 'No', 'Yes', 'Only with else', 'Only in for loops', 1, 'break can be used in both for and while loops.', 'beginner', 'Control Flow'),
('What is the purpose of indentation in if statements?', 'Decoration', 'Defines code blocks', 'Optional', 'For readability only', 1, 'Indentation defines which code belongs to the if block.', 'beginner', 'Control Flow'),
('How many spaces is standard indentation in Python?', '2 spaces', '4 spaces', '8 spaces', 'Tab only', 1, 'The standard is 4 spaces for indentation.', 'beginner', 'Control Flow'),
('What happens if you forget the colon after if?', 'Syntax error', 'Works fine', 'Warning', 'Indentation error', 0, 'Forgetting the colon causes a syntax error.', 'beginner', 'Control Flow'),
('Can you have elif without else?', 'No', 'Yes', 'Only with if', 'Must have both', 1, 'elif can exist without else, but must have an if.', 'beginner', 'Control Flow'),
('What is a loop counter?', 'Counts loop errors', 'Variable tracking iterations', 'Built-in function', 'Loop speed', 1, 'A loop counter is a variable that tracks the number of iterations.', 'beginner', 'Control Flow'),
('How do you loop through a string?', 'for char in string:', 'for string in char:', 'loop string:', 'Cannot loop strings', 0, 'Use "for char in string:" to iterate through string characters.', 'beginner', 'Control Flow'),
('What does range(0, 10, 2) generate?', 'All numbers 0-10', 'Even numbers 0-8', 'Odd numbers', '0, 2, 4, 6, 8, 10', 1, 'range(0, 10, 2) generates 0, 2, 4, 6, 8 (step of 2).', 'beginner', 'Control Flow'),
('Can you modify a list while iterating over it?', 'Yes, always safe', 'No, causes errors', 'Yes, but not recommended', 'Only with for loops', 2, 'Modifying while iterating can cause unexpected behavior.', 'beginner', 'Control Flow'),
('What is enumerate() used for?', 'Count items', 'Get index and value', 'Sort items', 'Filter items', 1, 'enumerate() provides both index and value during iteration.', 'beginner', 'Control Flow'),
('What does "for _ in range(5):" mean?', 'Error', 'Loop 5 times, ignore counter', 'Variable named _', 'All of the above', 1, 'The underscore means we do not need the loop counter.', 'beginner', 'Control Flow'),
('Can you use continue in a while loop?', 'No', 'Yes', 'Only in for loops', 'Only with break', 1, 'continue works in both for and while loops.', 'beginner', 'Control Flow'),
('What happens after continue is executed?', 'Loop exits', 'Goes to next iteration', 'Loop restarts', 'Error occurs', 1, 'continue skips the rest of current iteration and goes to the next.', 'beginner', 'Control Flow'),
('How do you check if a number is in a range with if?', 'if 1 < x < 10:', 'if x > 1 and x < 10:', 'if x in range(1,10):', 'All of the above', 3, 'All three methods work to check if a number is in a range.', 'beginner', 'Control Flow'),
('What is a sentinel value in loops?', 'Error value', 'Special value to stop loop', 'Loop counter', 'Default value', 1, 'A sentinel value is a special value used to indicate loop termination.', 'beginner', 'Control Flow'),
('Can you nest while loops inside for loops?', 'No', 'Yes', 'Only one level', 'Only for in while', 1, 'You can nest any type of loop inside another.', 'beginner', 'Control Flow'),
('What is short-circuit evaluation?', 'Fast loops', 'Stops checking conditions early', 'Loop optimization', 'Quick if statements', 1, 'Short-circuit means Python stops evaluating as soon as result is known.', 'beginner', 'Control Flow'),
('In "if a and b:", when is b checked?', 'Always', 'Only if a is True', 'Only if a is False', 'Never', 1, 'Python only checks b if a is True due to short-circuit evaluation.', 'beginner', 'Control Flow'),
('What does "if x:" check?', 'If x is True', 'If x is not zero/empty/None', 'If x exists', 'All of the above', 3, 'if x: checks if x has a truthy value (not 0, empty, None, or False).', 'beginner', 'Control Flow');

-- Enable Row Level Security (optional for production)
-- ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

