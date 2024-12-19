# Project Resources

Welcome to the project resources documentation. Below, you will find an extensive list of valuable links and code examples to assist you with your development process, including our top resources and 50 additional ones.

## Essential Links

- [Message History with LangchainJS](https://js.langchain.com/docs/how_to/message_history)
- [Anthropic API Client SDKs for TypeScript](https://docs.anthropic.com/en/api/client-sdks#typescript)
- [LangchainJS Discussions on GitHub](https://github.com/langchain-ai/langchainjs/discussions/4966)
- [LangGraphJS Example](https://langchain-ai.github.io/langgraphjs/#example)
- [Bun Bundler: Embed Directories](https://bun.sh/docs/bundler/executables#embed-directories)
- [Bun Runtime: Auto Import](https://bun.sh/docs/runtime/autoimport)
- [Bun Loaders](https://bun.sh/docs/bundler/loaders)
- [Bun Typescript Runtime](https://bun.sh/docs/runtime/typescript)
- [LangchainJS Cheerio Document Loader](https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-community/src/document_loaders/web/cheerio.ts)
- [Building with Claude](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)

## Additional Resources

- [OpenAI API Guide](https://beta.openai.com/docs/)
- [Building Chatbots with Rasa](https://rasa.com/docs/rasa/)
- [Deep Learning with TensorFlow](https://www.tensorflow.org/tutorials)
- [PyTorch Tutorials](https://pytorch.org/tutorials/)
- [Advanced React Patterns](https://reactpatterns.com/)
- [Redux Official Docs](https://redux.js.org/)
- [Vue.js Guide](https://vuejs.org/v2/guide/)
- [Angular Development](https://angular.io/docs)
- [Data Science with Jupyter](https://jupyter.org/documentation)
- [Machine Learning with Scikit-learn](https://scikit-learn.org/stable/user_guide.html)
- [GraphQL Documentation](https://graphql.org/learn/)
- [Apollo Client Guide](https://www.apollographql.com/docs/react/)
- [Rust Programming Language](https://doc.rust-lang.org/book/)
- [Kubernetes in Action](https://kubernetes.io/docs/tutorials/)
- [Docker Binaries](https://docs.docker.com/engine/reference/builder/)
- [Node.js Best Practices](https://nodejs.dev/learn)
- [Django for Web Development](https://docs.djangoproject.com/en/stable/)
- [Flask for Python Web Applications](https://flask.palletsprojects.com/en/2.0.x/tutorial/)
- [Spring Boot Guide](https://spring.io/guides)
- [Gradle Build Tool](https://docs.gradle.org/current/userguide/userguide.html)
- [Maven Project Management](https://maven.apache.org/guides/)
- [CI/CD with Jenkins](https://www.jenkins.io/doc/)
- [Terraform for Infrastructure as Code](https://www.terraform.io/docs)
- [AWS Cloud Development Kit](https://aws.amazon.com/cdk/)
- [Azure DevOps Services](https://docs.microsoft.com/en-us/azure/devops/)
- [Google Cloud Platform Overview](https://cloud.google.com/docs)
- [IBM Cloud Documentation](https://cloud.ibm.com/docs)
- [Red Hat OpenShift](https://www.openshift.com/learn)
- [Cypress for Automated Testing](https://www.cypress.io/documentation)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Mocha Testing Manual](https://mochajs.org/#getting-started)
- [Selenium for Web Testing](https://www.selenium.dev/documentation/en/)
- [Continuous Deployment with GitHub Actions](https://docs.github.com/en/actions)
- [Metadata with JSON-LD](https://json-ld.org/)
- [Web Security with OWASP](https://owasp.org/www-project-top-ten/)
- [JavaScript Patterns](https://addyosmani.com/resources/essentialjsdesignpatterns/book/)
- [Elasticsearch for Data Search](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Apache Kafka Guide](https://kafka.apache.org/documentation/)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Redis Documentation](https://redis.io/documentation)
- [NoSQL Database MongoDB](https://docs.mongodb.com/manual/)
- [PostgreSQL for Databases](https://www.postgresql.org/docs/)
- [Linux Command Line Basics](https://linuxcommand.org/)
- [Bash Scripting Tutorials](https://tldp.org/LDP/Bash-Beginners-Guide/html/)
- [Automating Tasks with Ansible](https://docs.ansible.com/ansible/latest/user_guide/index.html)
- [Chef Automation Documentation](https://docs.chef.io/)
- [Puppet Configuration Management](https://puppet.com/docs/puppet/latest/puppet_index.html)

## Code Examples

### Using @anthropic-ai/sdk
### Tool Streaming
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { inspect } from 'util';

// gets API Key from environment variable ANTHROPIC_API_KEY
const client = new Anthropic();

async function main() {
  const stream = client.messages
    .stream({
      messages: [
        {
          role: 'user',
          content: `What is the weather in SF?`,
        },
      ],
      tools: [
        {
          name: 'get_weather',
          description: 'Get the weather at a specific location',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'The city and state, e.g. San Francisco, CA' },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'Unit for the output',
              },
            },
            required: ['location'],
          },
        },
      ],
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
    })
    // When a JSON content block delta is encountered this
    // event will be fired with the delta and the currently accumulated object
    .on('inputJson', (delta, snapshot) => {
      console.log(`delta: ${delta}`);
      console.log(`snapshot: ${inspect(snapshot)}`);
      console.log();
    });

  await stream.done();
}

main();
```

#### Tools
```typescript

import Anthropic from '@anthropic-ai/sdk';
import assert from 'node:assert';

const client = new Anthropic(); // gets API Key from environment variable ANTHROPIC_API_KEY

async function main() {
  const userMessage: Anthropic.MessageParam = {
    role: 'user',
    content: 'What is the weather in SF?',
  };
  const tools: Anthropic.Tool[] = [
    {
      name: 'get_weather',
      description: 'Get the weather for a specific location',
      input_schema: {
        type: 'object',
        properties: { location: { type: 'string' } },
      },
    },
  ];

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 1024,
    messages: [userMessage],
    tools,
  });
  console.log('Initial response:');
  console.dir(message, { depth: 4 });

  assert(message.stop_reason === 'tool_use');

  const tool = message.content.find(
    (content): content is Anthropic.ToolUseBlock => content.type === 'tool_use',
  );
  assert(tool);

  const result = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 1024,
    messages: [
      userMessage,
      { role: message.role, content: message.content },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: tool.id,
            content: [{ type: 'text', text: 'The weather is 73f' }],
          },
        ],
      },
    ],
    tools,
  });
  console.log('\nFinal response');
  console.dir(result, { depth: 4 });
}

main();
```

#### streaming
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // gets API Key from environment variable ANTHROPIC_API_KEY

async function main() {
  const stream = client.messages
    .stream({
      messages: [
        {
          role: 'user',
          content: `Hey Claude! How can I recursively list all files in a directory in Rust?`,
        },
      ],
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
    })
    // Once a content block is fully streamed, this event will fire
    .on('contentBlock', (content) => console.log('contentBlock', content))
    // Once a message is fully streamed, this event will fire
    .on('message', (message) => console.log('message', message));

  for await (const event of stream) {
    console.log('event', event);
  }

  const message = await stream.finalMessage();
  console.log('finalMessage', message);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

#### tool-use
```shell
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "tools": [{
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "The unit of temperature, either 'celsius' or 'fahrenheit'"
                }
            },
            "required": ["location"]
        }
    },
    {
        "name": "get_time",
        "description": "Get the current time in a given time zone",
        "input_schema": {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": "The IANA time zone name, e.g. America/Los_Angeles"
                }
            },
            "required": ["timezone"]
        }
    }],
    "messages": [{
        "role": "user",
        "content": "What is the weather like right now in New York? Also what time is it there?"
    }]
}'

```


# Extensive Anthropic Code Examples
## https://docs.anthropic.com/en/docs/build-with-claude
### https://docs.anthropic.com/en/docs/build-with-claude/tool-use

#### [Giving Claude a role with a system prompt]([https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts))

#### [Chain complex prompts for stronger performance](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts)


#### [How to implement tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use#example-simple-tool-definition)
