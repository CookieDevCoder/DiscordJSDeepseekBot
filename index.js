const { Client, Events, GatewayIntentBits, ActivityType} = require('discord.js');
require('dotenv').config();
// Ollama for chat
const axios = require('axios');

// Json File
const fs = require('fs');

// Intents for messaging
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
	    GatewayIntentBits.GuildMessages,
	    GatewayIntentBits.MessageContent,
	    GatewayIntentBits.DirectMessages
    ]
});

// Custom Instructions for the AI to follow
const AIInstructions = `You are A helpful AI Discord Bot.
The user will start with username: [insert their reply]
You must reply to whatever the person said.
Your response should be compatable with markdown.
Your response must be short, fewer than 2000 characters.`

// What to type for bot to respond, Should contain empty space at end ' '
const BotCommand = "!ask "

client.once(Events.ClientReady, c => {
    
    console.log(`Ready! Logged in as ${c.user.tag} `);
    // Set Activity for Discord User
    client.user.setActivity('You', { type: ActivityType.Listening });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.toLowerCase().startsWith(BotCommand)) {
        return;
    }
    MessageAuthor = message.author.displayName;
    // removes !ask from input
    const userInput = message.content.slice(5);
    const SystemInput = AIInstructions + `\nYou are currently Speaking to a user Named ${message.author.displayName}`

    console.log("User typed:\n" + userInput + "\n" + SystemInput);

    // Shows the bot is typing while it is thinking
    await message.channel.sendTyping();
    try {
        // Send Request to Locally Hosted Ollama Deepseek
        const response = await axios.post(
        'http://localhost:11434/api/chat',
        {
            model: 'deepseek-r1:7b',
            messages: [
                { role: 'system', content: SystemInput},
                { role: 'user', content: userInput }
            ]
        },
            { headers: { 'Content-Type': 'application/json' } }
        );

        console.log("generated response, dumped into JsonFile");
        const formatted = JSON.stringify(response.data, null, 2);
        fs.writeFileSync('response.json', response.data, 'utf-8');

        // Combining generated Response
        const lines = fs.readFileSync('response.json', 'utf8').split('\n');
        let fullMessage = '';
        for (const line of lines) {
            try {
                //reads each line from response.json and gets message content
                if (!line.trim()) continue;
                const json = JSON.parse(line);
                const chunk = json.message?.content;
                if (chunk) fullMessage += chunk;
            } catch (e) {
              console.error('Failed to parse line:', line);
            }
        }
        console.log("Message Sent\n" + fullMessage);
        // removes thinking Phase of reply
        const botReply = fullMessage.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        message.reply(botReply);
    }
    catch(err) {
        console.error(err.message);
        message.reply("There was an Error with recieving the response.");
    }
});

client.login(process.env.DISCORD_TOKEN);