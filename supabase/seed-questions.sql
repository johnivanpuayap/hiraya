-- Sample PhilNITS FE questions for development and testing
-- Difficulty: 0.0 = average, negative = easier, positive = harder
-- Discrimination: 1.0 = default (Rasch model), higher = more discriminating

-- Technology
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'Which of the following best describes cloud computing?',
  'A local network of computers in an office',
  'On-demand delivery of IT resources over the internet with pay-as-you-go pricing',
  'A type of programming language used for web development',
  'A physical server stored in a company''s basement',
  'b',
  (SELECT id FROM public.categories WHERE name = 'technology'),
  '2023 April FE', -1.0, 1.0
),
(
  'What does IoT (Internet of Things) refer to?',
  'A new version of the internet protocol',
  'A social media platform for sharing ideas',
  'A network of physical devices embedded with sensors and software that connect and exchange data',
  'A programming framework for building mobile apps',
  'c',
  (SELECT id FROM public.categories WHERE name = 'technology'),
  '2023 October FE', -0.5, 1.0
),
(
  'Which technology is primarily used for decentralized, tamper-resistant record keeping?',
  'Virtual Reality',
  'Blockchain',
  'Augmented Reality',
  'Machine Learning',
  'b',
  (SELECT id FROM public.categories WHERE name = 'technology'),
  '2024 April FE', 0.5, 1.2
);

-- Management
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'In the PDCA cycle, what does the "C" stand for?',
  'Create',
  'Check',
  'Control',
  'Change',
  'b',
  (SELECT id FROM public.categories WHERE name = 'management'),
  '2023 April FE', -1.5, 1.0
),
(
  'Which of the following is a key principle of Total Quality Management (TQM)?',
  'Minimizing employee involvement',
  'Continuous improvement',
  'Reducing customer feedback channels',
  'Centralizing all decision-making',
  'b',
  (SELECT id FROM public.categories WHERE name = 'management'),
  '2023 October FE', 0.0, 1.0
),
(
  'What is the primary purpose of a Service Level Agreement (SLA)?',
  'To define the programming languages used in a project',
  'To set expectations for service delivery between a provider and customer',
  'To outline the physical layout of a data center',
  'To list all employees in the IT department',
  'b',
  (SELECT id FROM public.categories WHERE name = 'management'),
  '2024 April FE', 0.5, 1.1
);

-- Strategy
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What does a SWOT analysis evaluate?',
  'Software, Websites, Operations, Technology',
  'Strengths, Weaknesses, Opportunities, Threats',
  'Sales, Warranties, Output, Timelines',
  'Systems, Workflows, Objectives, Tasks',
  'b',
  (SELECT id FROM public.categories WHERE name = 'strategy'),
  '2023 April FE', -1.5, 1.0
),
(
  'Which IT strategy focuses on using technology to gain competitive advantage?',
  'Cost reduction strategy',
  'Strategic information systems planning',
  'Hardware maintenance planning',
  'Employee training schedule',
  'b',
  (SELECT id FROM public.categories WHERE name = 'strategy'),
  '2023 October FE', 0.5, 1.0
);

-- Hardware
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'Which component is responsible for performing arithmetic and logical operations in a computer?',
  'RAM',
  'Hard Drive',
  'ALU (Arithmetic Logic Unit)',
  'Power Supply',
  'c',
  (SELECT id FROM public.categories WHERE name = 'hardware'),
  '2023 April FE', -1.0, 1.0
),
(
  'What is the purpose of cache memory?',
  'To permanently store the operating system',
  'To provide high-speed data access to the processor by storing frequently used data',
  'To connect peripheral devices to the motherboard',
  'To convert analog signals to digital',
  'b',
  (SELECT id FROM public.categories WHERE name = 'hardware'),
  '2024 April FE', 0.0, 1.2
),
(
  'In the context of storage, what does RAID stand for?',
  'Random Access Internal Drive',
  'Redundant Array of Independent Disks',
  'Rapid Automated Information Delivery',
  'Remote Access to Internet Data',
  'b',
  (SELECT id FROM public.categories WHERE name = 'hardware'),
  '2024 April FE', 0.5, 1.0
);

-- Software
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What is the main purpose of an operating system?',
  'To browse the internet',
  'To manage hardware resources and provide services for application software',
  'To create documents and spreadsheets',
  'To protect against viruses',
  'b',
  (SELECT id FROM public.categories WHERE name = 'software'),
  '2023 April FE', -1.5, 1.0
),
(
  'Which of the following is an example of open-source software?',
  'Microsoft Office',
  'Adobe Photoshop',
  'Linux',
  'Windows 11',
  'c',
  (SELECT id FROM public.categories WHERE name = 'software'),
  '2023 October FE', -1.0, 1.0
),
(
  'What is the difference between a compiler and an interpreter?',
  'A compiler translates the entire source code at once, while an interpreter translates line by line',
  'A compiler is faster than an interpreter at runtime',
  'An interpreter produces an executable file, while a compiler does not',
  'There is no difference; they are the same',
  'a',
  (SELECT id FROM public.categories WHERE name = 'software'),
  '2024 April FE', 0.0, 1.1
);

-- Database
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What does SQL stand for?',
  'Simple Query Language',
  'Structured Query Language',
  'System Query Logic',
  'Standard Question Language',
  'b',
  (SELECT id FROM public.categories WHERE name = 'database'),
  '2023 April FE', -2.0, 1.0
),
(
  'Which normal form eliminates transitive dependencies?',
  'First Normal Form (1NF)',
  'Second Normal Form (2NF)',
  'Third Normal Form (3NF)',
  'Boyce-Codd Normal Form (BCNF)',
  'c',
  (SELECT id FROM public.categories WHERE name = 'database'),
  '2024 April FE', 1.0, 1.2
),
(
  'What is the purpose of an index in a database?',
  'To encrypt sensitive data',
  'To create a backup of the database',
  'To speed up data retrieval operations',
  'To enforce referential integrity',
  'c',
  (SELECT id FROM public.categories WHERE name = 'database'),
  '2023 October FE', -0.5, 1.0
);

-- Networking
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'Which protocol is used to send email?',
  'HTTP',
  'FTP',
  'SMTP',
  'DNS',
  'c',
  (SELECT id FROM public.categories WHERE name = 'networking'),
  '2023 April FE', -1.0, 1.0
),
(
  'What is the primary function of a router?',
  'To store web pages',
  'To forward data packets between computer networks',
  'To convert digital signals to analog',
  'To provide electricity to network devices',
  'b',
  (SELECT id FROM public.categories WHERE name = 'networking'),
  '2023 October FE', -0.5, 1.0
),
(
  'Which layer of the OSI model is responsible for end-to-end communication and error recovery?',
  'Network Layer',
  'Data Link Layer',
  'Transport Layer',
  'Application Layer',
  'd',
  (SELECT id FROM public.categories WHERE name = 'networking'),
  '2024 April FE', 1.0, 1.1
);

-- Security
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What is the primary goal of encryption?',
  'To speed up data transmission',
  'To compress data for storage',
  'To protect data confidentiality by making it unreadable without the correct key',
  'To create backup copies of data',
  'c',
  (SELECT id FROM public.categories WHERE name = 'security'),
  '2023 April FE', -1.0, 1.0
),
(
  'What type of attack involves intercepting communication between two parties without their knowledge?',
  'Phishing',
  'Man-in-the-middle attack',
  'Brute force attack',
  'SQL injection',
  'b',
  (SELECT id FROM public.categories WHERE name = 'security'),
  '2023 October FE', 0.0, 1.2
);

-- Algorithms & Data Structures
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What is the time complexity of binary search on a sorted array?',
  'O(n)',
  'O(n²)',
  'O(log n)',
  'O(1)',
  'c',
  (SELECT id FROM public.categories WHERE name = 'algorithms'),
  '2023 April FE', 0.0, 1.2
),
(
  'Which data structure follows the FIFO (First In, First Out) principle?',
  'Stack',
  'Queue',
  'Binary Tree',
  'Hash Table',
  'b',
  (SELECT id FROM public.categories WHERE name = 'algorithms'),
  '2023 October FE', -1.0, 1.0
),
(
  'What is the worst-case time complexity of quicksort?',
  'O(n log n)',
  'O(n)',
  'O(n²)',
  'O(log n)',
  'c',
  (SELECT id FROM public.categories WHERE name = 'algorithms'),
  '2024 April FE', 0.5, 1.1
);

-- System Development
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'Which software development model follows a sequential, linear approach?',
  'Agile',
  'Waterfall',
  'Scrum',
  'Extreme Programming',
  'b',
  (SELECT id FROM public.categories WHERE name = 'system-development'),
  '2023 April FE', -1.5, 1.0
),
(
  'What is the purpose of a use case diagram in UML?',
  'To show the physical deployment of software',
  'To describe interactions between users and the system',
  'To display the database schema',
  'To illustrate the class hierarchy',
  'b',
  (SELECT id FROM public.categories WHERE name = 'system-development'),
  '2024 April FE', 0.0, 1.0
);

-- Project Management
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What is the critical path in project management?',
  'The path with the least number of tasks',
  'The longest sequence of dependent tasks that determines the minimum project duration',
  'The path that uses the most resources',
  'The first set of tasks to be completed',
  'b',
  (SELECT id FROM public.categories WHERE name = 'project-management'),
  '2023 April FE', 0.0, 1.0
),
(
  'In a Gantt chart, what do horizontal bars represent?',
  'Budget allocation',
  'Team member assignments',
  'Task duration and timeline',
  'Risk severity levels',
  'c',
  (SELECT id FROM public.categories WHERE name = 'project-management'),
  '2023 October FE', -0.5, 1.0
),
(
  'What does the term "scope creep" refer to in project management?',
  'A reduction in project budget',
  'The uncontrolled expansion of project scope without adjustments to time, cost, and resources',
  'A delay in project delivery',
  'A conflict between team members',
  'b',
  (SELECT id FROM public.categories WHERE name = 'project-management'),
  '2024 April FE', 0.0, 1.1
);
