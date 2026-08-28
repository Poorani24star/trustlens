/**
 * TrustLens Centralized Domain Configuration (Backend)
 * Official domain configuration defining Computer Science as the supported domain
 * for TrustLens Error Detection and Knowledge Source Management.
 */

const SUPPORTED_DOMAIN = 'Computer Science';

const SUPPORTED_TOPICS = [
  'Data Structures and Algorithms',
  'Database Management Systems',
  'Operating Systems',
  'Computer Networks',
  'Cloud Computing',
  'Artificial Intelligence',
  'Machine Learning',
  'Data Mining',
  'Software Engineering',
  'Web Technologies',
  'Programming Languages',
  'Cybersecurity',
  'Computer Architecture',
  'Distributed Systems',
];

/**
 * Topic keyword definitions for future domain and topic detection tasks
 */
const TOPIC_KEYWORDS = {
  'Data Structures and Algorithms': [
    'array', 'linked list', 'stack', 'queue', 'tree', 'graph', 'sorting', 'searching',
    'algorithm', 'binary tree', 'hash map', 'time complexity', 'space complexity', 'recursion',
    'dynamic programming', 'pointer'
  ],
  'Database Management Systems': [
    'database', 'dbms', 'sql', 'normalization', 'transaction', 'acid', 'table', 'query',
    'relational', 'primary key', 'foreign key', 'index', 'schema', 'nosql', 'mongodb', 'postgres'
  ],
  'Operating Systems': [
    'operating system', 'process', 'thread', 'scheduling', 'memory management', 'kernel',
    'deadlock', 'cpu scheduling', 'virtual memory', 'paging', 'file system', 'semaphore', 'mutex'
  ],
  'Computer Networks': [
    'tcp', 'udp', 'ip', 'routing', 'network', 'protocol', 'osi', 'dns', 'router', 'switch',
    'packet', 'subnet', 'lan', 'wan', 'ethernet', 'firewall', 'http', 'https'
  ],
  'Cloud Computing': [
    'cloud', 'virtualization', 'virtual machine', 'vm', 'container', 'docker', 'kubernetes',
    'iaas', 'paas', 'saas', 'aws', 'azure', 'gcp', 'serverless', 'hypervisor', 'ec2', 's3'
  ],
  'Artificial Intelligence': [
    'artificial intelligence', 'ai', 'intelligent agent', 'reasoning', 'knowledge representation',
    'heuristic', 'expert system', 'nlp', 'natural language processing', 'turing test', 'robotics'
  ],
  'Machine Learning': [
    'machine learning', 'model', 'training', 'classification', 'regression', 'dataset', 'prediction',
    'neural network', 'deep learning', 'supervised learning', 'unsupervised learning', 'gradient descent'
  ],
  'Data Mining': [
    'data mining', 'clustering', 'classification', 'association rules', 'pattern', 'k-means',
    'data warehouse', 'etl', 'frequent itemset', 'anomaly detection'
  ],
  'Software Engineering': [
    'software development', 'sdlc', 'requirements', 'testing', 'design pattern', 'agile',
    'scrum', 'waterfall', 'unit testing', 'ci/cd', 'uml', 'refactoring'
  ],
  'Web Technologies': [
    'html', 'css', 'javascript', 'frontend', 'backend', 'http', 'api', 'react', 'node.js',
    'express', 'rest api', 'graphql', 'dom', 'json', 'web browser'
  ],
  'Programming Languages': [
    'compiler', 'interpreter', 'java', 'python', 'c++', 'programming language', 'syntax',
    'typescript', 'type system', 'semantics', 'object-oriented', 'functional programming'
  ],
  'Cybersecurity': [
    'encryption', 'authentication', 'authorization', 'firewall', 'malware', 'vulnerability',
    'cybersecurity', 'decryption', 'cryptography', 'hash function', 'rsa', 'ssl', 'tls'
  ],
  'Computer Architecture': [
    'cpu', 'processor', 'cache', 'memory', 'instruction', 'architecture', 'alu', 'register',
    'pipelining', 'microprocessor', 'ram', 'rom', 'bus', 'risc', 'cisc'
  ],
  'Distributed Systems': [
    'distributed system', 'distributed computing', 'node', 'replication', 'consensus',
    'fault tolerance', 'paxos', 'raft', 'sharding', 'cap theorem', 'load balancer', 'microservices'
  ]
};

/**
 * Domain Data Structure Helpers
 */

function getSupportedDomain() {
  return SUPPORTED_DOMAIN;
}

function getSupportedTopics() {
  return [...SUPPORTED_TOPICS];
}

function isSupportedTopic(topic) {
  if (!topic || typeof topic !== 'string') return false;
  return SUPPORTED_TOPICS.some(t => t.toLowerCase() === topic.trim().toLowerCase());
}

function getTopicKeywords(topic) {
  if (!topic || typeof topic !== 'string') return [];
  const foundTopic = SUPPORTED_TOPICS.find(t => t.toLowerCase() === topic.trim().toLowerCase());
  return foundTopic ? [...(TOPIC_KEYWORDS[foundTopic] || [])] : [];
}

/**
 * Task 7 Knowledge Retrieval Configuration Constants
 */
const RETRIEVAL_LIMITS = {
  MAX_PRIMARY_TOPIC_ENTRIES: 20,
  MAX_RELATED_TOPIC_ENTRIES_PER_TOPIC: 10,
  MAX_TOTAL_RETRIEVED_ENTRIES: 40,
};

const RETRIEVAL_PRIORITY_SCORES = {
  PRIMARY_TOPIC_MATCH: 100,
  RELATED_TOPIC_MATCH: 50,
  MULTI_TOPIC_BONUS: 10,
};

/**
 * Task 9 Statement-to-Knowledge Comparison Configuration Constants
 */
const MIN_SIMILARITY_THRESHOLD = 0.20;

const COMPARISON_STATUS = {
  MATCHED: 'matched',
  NO_SUFFICIENT_MATCH: 'no_sufficient_match',
  NO_KNOWLEDGE_AVAILABLE: 'no_knowledge_available',
  NO_STATEMENTS: 'no_statements',
};

/**
 * Task 10 Factual Error Classification Categories
 */
const FACTUAL_CLASSIFICATION = {
  SUPPORTED: 'SUPPORTED',
  INCORRECT: 'INCORRECT',
  MISLEADING: 'MISLEADING',
  UNSUPPORTED: 'UNSUPPORTED',
  NO_KNOWLEDGE_AVAILABLE: 'NO_KNOWLEDGE_AVAILABLE',
};

module.exports = {
  SUPPORTED_DOMAIN,
  SUPPORTED_TOPICS,
  TOPIC_KEYWORDS,
  RETRIEVAL_LIMITS,
  RETRIEVAL_PRIORITY_SCORES,
  MIN_SIMILARITY_THRESHOLD,
  COMPARISON_STATUS,
  FACTUAL_CLASSIFICATION,
  getSupportedDomain,
  getSupportedTopics,
  isSupportedTopic,
  getTopicKeywords,
};
