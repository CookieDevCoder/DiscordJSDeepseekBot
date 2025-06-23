// Discord.js for all the discord bot stuff
const { Client, Events, GatewayIntentBits, ActivityType} = require('discord.js');
// dotenv file to avoid leaking Discord Bot's Token
require('dotenv').config();
// HTTP Client for communicating with Ollama using HTTP Requests
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
    // prevents bots from activating the bot, also preventing accidental recursion
    // Also checks if User used the bot command.
    if (message.author.bot || !message.content.toLowerCase().startsWith(BotCommand)) return;
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
            // Ollama is locally hosted on the 11434 port
            'http://localhost:11434/api/chat',
            {
                // model should be the desired model to use
                model: 'deepseek-r1:7b',
                messages: [
                    // role: system sets up rules and instructions the bot should follow
                    { role: 'system', content: SystemInput},
                    // role: user sends the message from the user to the chatbot to generate a response.
                    { role: 'user', content: userInput }
                ]
            },
            // headers: content type asks for the returned message to be in json format.
            { headers: { 'Content-Type': 'application/json' } }
        );

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
        console.log("Message Sent:\n" + fullMessage);
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