import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { apiKey } from './config';
import Tts from 'react-native-tts';
import isSpeaking from 'react-native-tts';
import Voice from '@react-native-community/voice';

type Message = {
    role: string;
    content: string;
};

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [defaultLanguage, setDefaultLanguage] = useState('en-US');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        // Add dummy event listeners
        Voice.onSpeechStart = () => { };
        Voice.onSpeechEnd = () => { };

        // Cleanup on unmount
        return () => {
            Voice.onSpeechStart = () => { };
            Voice.onSpeechEnd = () => { };
        };
    }, []);

    useEffect(() => {
        const initializeVoice = async () => {
            try {
                await Voice.start(defaultLanguage);
            } catch (error) {
                console.error("Failed to initialize Voice:", error);
            }
        };

        initializeVoice();

        const language = input.toLowerCase().includes('language') ? input : 'en-US';
        Voice.start(language);
        Voice.onSpeechResults = handleSpeechResults;
        restartConversation();
    }, []);

    const handleSpeechResults = (e: { value?: string[] }) => {
        if (e.value && e.value.length > 0) {
            setInput(e.value[0]);
            setIsRecording(false);
        }
    };

    const startRecording = async () => {
        setIsRecording(true);
        setInput('');
        try {
            await Voice.start(defaultLanguage);
        } catch (error) {
            console.error('Error starting speech recognition:', error);
        }
    };

    const stopRecording = async () => {
        setIsRecording(false);
        try {
            await Voice.stop();
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    };

    const restartConversation = () => {
        const botMessage = 'Hello, I am Max the Appliance Pro, your personal A.I. Assistant. How can I help you with your appliance repair today?';
        setMessages([{ role: 'assistant', content: botMessage }]);
    };

    useEffect(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const speakText = async () => {
        try {
            if (await isSpeaking) {
                await Tts.stop();
            } else {
                await Tts.speak(input);
            }
        } catch (error) {
            console.error('Error speaking text:', error);
        }
    };

    const clearInput = () => {
        setInput('');
    };

    const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
    const MODEL_NAME = 'gpt-4';
    const SYSTEM_MESSAGE_1 = 'You are ChatGPT, a large language model trained by OpenAI, based on the GPT-4 architecture.';
    const SYSTEM_MESSAGE_2 = `REQUEST_PERSONA_CREATION (NAME:"Max the Appliance Pro", FOCUS:"AI assistant for appliance repair", 
BIO:"An AI assistant with 8 skills including comprehensive diagnostics, safety practices, and staying up-to-date with industry trends. Adapts to users' unique needs and avoids 9 no-nos.", 
SKILLS:{1:"Comprehensive knowledge of diagnostics and repair techniques.",2:"Familiarity with appliance brands, models, and common issues.",3:"Step-by-step guidance for troubleshooting and repair.",4:"Expertise in recommending suitable parts and tools.",5:"Clear, patient, and effective communication.",6:"Adaptability to various skill levels and learning styles.",7:"Dedication to staying up-to-date with industry trends.",8:"Strong emphasis on safety guidelines."}, 
NO_NOS:{1:"Providing inaccurate or misleading information.",2:"Encouraging unsafe actions.",3:"Ignoring users' skill levels and experience.",4:"Demonstrating impatience or frustration.",5:"Promoting unreliable or untested repair methods.",6:"Overlooking essential safety guidelines.",7:"Inability to adapt to different user needs.",8:"Offering unsolicited or irrelevant advice.",9:"Do not switch from GPT-4 to a default model."}, 
TEMPLATE:"AI persona Max the Appliance Pro for appliance repair industry. Adapts to users' unique needs and avoids unreliable repair methods and safety violations.", 
INSTRUCTIONS:"Create AI persona Max the Appliance Pro for appliance repair industry with 8 skills, including comprehensive diagnostics, expertise in parts and tools, and a strong emphasis on safety. Avoids 9 no-nos, prioritizes adapting to each user's unique needs for optimal ability enhancement and high-quality user experience."`;
    const SYSTEM_MESSAGE_3 = `Using the provided make, model, and serial number, access available information and resources to provide a thorough and complete diagnosis of the home appliance. Identify common issues and suggest possible solutions based on the appliance's specific information. Include estimated likelihood percentages for each identified issue. Include detailed and comprehensive guide to locate, access, test, diagnose, and repair the identified parts. Include factory and aftermarket part numbers`;

    // Helper function to prepare chat messages
    const prepare_chat_messages = (user_input: string, recent_messages: Message[]) => {
        return [
            { role: 'system', content: SYSTEM_MESSAGE_1 },
            { role: 'system', content: SYSTEM_MESSAGE_2 },
            { role: 'system', content: SYSTEM_MESSAGE_3 },
            ...recent_messages,
            { role: 'user', content: user_input }
        ];
    };

    // The refactored sendMessage function
    const sendMessage = async () => {
        if (!input) return;

        const new_message = { role: 'user', content: input };
        const updated_messages = [...messages, new_message];
        setMessages(updated_messages);
        const lastMessages = updated_messages.slice(-5);

        const chatMessages = prepare_chat_messages(input, lastMessages);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: chatMessages,
                }),
            });
            const data = await response.json();
            const botMessage = data.choices[0].message.content;
            setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: botMessage }]);
            setInput('');
        } catch (error) {
            console.error("Error communicating with the GPT-4 API:", error);
        }
    };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Image style={styles.logo} source={require("./bot.png")} />
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `message-${index}`}
        renderItem={({ item, index }) => (
          <View style={[styles.message, index % 2 === 0 ? styles.even : styles.odd]}>
            {index % 2 === 0 && (
              <Image style={styles.avatar} source={require("./bot.png")} />
            )}
            {index % 2 !== 0 && (
              <Image style={styles.avatar} source={require("./lightbulb_1.jpg")} />
            )}
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <Text>Ad Space</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { height: input.length > 0 ? 80 : 40 }]}
          onChangeText={text => setInput(text)}
          value={input}
          multiline={true}
          placeholder="Type your message..."
          placeholderTextColor="black"
        />
        <View style={styles.buttonContainer}>
          <Button onPress={sendMessage} title="Send" color="#841584" />
          <Button onPress={restartConversation} title="Start New Conversation" color="#20B2AA" />
        </View>
      </View>
      <View style={styles.voiceButtonContainer}>
        <TouchableOpacity style={styles.voiceButton} onPress={isRecording ? stopRecording : startRecording}>
          <Text style={styles.voiceButtonText}>{isRecording ? 'Stop' : 'Start'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.speakButton} onPress={speakText}>
          <Text style={styles.speakButtonText}>{isSpeaking ? 'Stop' : 'Speak'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={clearInput}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  header: {
    height: 115,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingHorizontal: 10,
  },
  logo: {
    width: 195,
    height: 150,
  },
  avatar: {
    width: 45,
    height: 30,
    borderRadius: 22.5,
    marginRight: 10,
  },
  footer: {
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  inputContainer: {
    flexDirection: 'column',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    color: 'black',
  },
  message: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  even: {
    backgroundColor: 'green',
  },
  odd: {
    backgroundColor: '#00f',
    alignSelf: 'flex-end',
  },
  messageText: {
    color: '#fff',
  },
  chatContentContainer: {
    flexGrow: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  voiceButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  voiceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'blue',
    marginRight: 10,
  },
  voiceButtonText: {
    fontSize: 18,
    color: 'white',
  },
  speakButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'green',
    marginRight: 10,
  },
  speakButtonText: {
    fontSize: 18,
    color: 'white',
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'red',
  },
  clearButtonText: {
    fontSize: 18,
    color: 'white',
  },
});

export default App;