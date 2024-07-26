import { Loader2, ClipboardCopy, Settings, X, History } from "lucide-react";
import React, { useContext, useEffect, useRef, useState } from "react";
import { APIContext, ChatContext, ModelsStateContext } from "../app";
import NavBar from "../components/navbar";
import ParametersSidePanel from "../components/parameters-side-panel";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useToast } from "../hooks/ui/use-toast";
import { ChatMessage } from "./chat/chatmessage";
import { Convos } from "./chat/convos";
import { openDB } from 'idb';
import AudioDisplay from "./chat/audiodisplay";

export enum Role {
    USER = "user",
    ASSISTANT = "assistant",
    SYSTEM = "system"
}

export interface ChatMessage {
  role: Role,
  content: string,
  date: Date,
  images?: any[]
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  type: string;
  payload: any;
}

export interface Convo {
  messages: ChatMessage[];
  name: String;
}

const CustomAlertDialogue = ({dialog}) => {
    const [openDialog, setOpenDialog] = React.useState<boolean>(false)

    const [_dialogue, _setDialogue] = React.useState<any>({
      title: "",
      message: ""
    })
  
    useEffect(() => {
      if (!openDialog && dialog.title !== "" && dialog.message !== "") {
        _setDialogue({
          title: dialog.title,
          message: dialog.message
        })
        setOpenDialog(true)
      }
    }, [dialog])
  
    return (
      <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{_dialogue.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700 dark:text-slate-400">
              {_dialogue.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )
  }

export default function Chat() {
    const apiContext = useContext(APIContext)
    const {chatContext, setChatContext} = useContext(ChatContext)
    const [paramsVisible, setParamsVisible] = React.useState<boolean>(true);
    const parameterSidebar = (<ParametersSidePanel showModelDropdown={true} showModelList ={false} setParamsVisible = {setParamsVisible}/>)
    const [textAreaVal, setTextAreaVal] = useState(''); // Declare a state variable...
    const {modelsStateContext} = useContext(ModelsStateContext)
    const cancel_callback = React.useRef<any>(null)
    const scrollRef = useRef(null)
    const silenceTimeout = useRef(null);

    const audioContext = useRef(null);
    const streamRef = useRef(null);
    const processorRef = useRef(null);

    const [recording, setRecording] = useState(false);

    const [audioRms, setAudioRms] = useState(0); // Declare a state variable...
    const [rmsThreshold, setRmsThreshold] = useState(30); // Declare a state variable...

    const audioChunksRef = useRef([]);
    const mediaRecorderRef = useRef(null);
    const [audioOn, setAudioOn] = useState(false);
    const [autoRecord, setAutoRecord] = useState(false);

    const [uploadedFiles, setUploadedFiles] = useState([]);

    let convo = chatContext.convos[chatContext.activeConvo];
    let systemMessage : ChatMessage = convo.messages.find(x => x.role === Role.SYSTEM);;

    const { toast } = useToast()

    const [convosVisible, setConvosVisible] = React.useState<boolean>(true);

    const [generating, setGenerating] = React.useState<boolean>(false);

    const [dialog, showDialog] = React.useState({
      title: "",
      message: ""
    })
    
    function flatMap<T, U>(array: T[], callback: (value: T, index: number, array: T[]) => U[]): U[] {
      return Array.prototype.concat.apply([], array.map(callback));
    }

    useEffect(() => {

      const initDB = async () => {
        const db = await openDB('llmplayground-files', 1, {
          upgrade(db) {
            db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
          },
        });

        // Load files from IndexedDB
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');

        let fileRefs = chatContext.convos
          .flatMap(convo => convo.messages)
          .flatMap(message => message.attachments)
          .filter(x => !!x)

        const keys = await store.getAllKeys();

        // Iterate through each key and check if it exists in imageRefs
        await Promise.all(keys.map(async key => {
          const data = await store.get(key);
          const fileExists = fileRefs.some(ref => ref.id === data.id);

          if (!fileExists) {
            // Delete the image if it does not exist in imageRefs
            console.log("DELETING IMAGE WITH ID " + key);
            await store.delete(key);
          }
        }));

        // Commit the transaction
        await tx.done;
      };
      initDB();
    }, []);

    useEffect(() => {  
      const startListening = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        const processor = audioContext.createScriptProcessor(1024, 1, 1);
  
        analyser.fftSize = 1024;
        source.connect(analyser);
        analyser.connect(processor);
        processor.connect(audioContext.destination);
        processorRef.current = processor;
        setAudioProcessorCallback();
      };
  
      if (audioOn) {
        startListening();
      } else {
        if (processorRef.current) {
          processorRef.current.disconnect();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (audioContext.current) {
          audioContext.current.close();
        }
      }
    }, [audioOn]);

    useEffect(() => {
      setAudioProcessorCallback();
    }, [rmsThreshold, recording, silenceTimeout.current, autoRecord]);

    const setAudioProcessorCallback = () => {
      if (!processorRef || !processorRef.current) {
        return;
      }
      processorRef.current.onaudioprocess = (e) => {

        const data = e.inputBuffer.getChannelData(0);
        let rms = Math.sqrt(data.reduce((sum, val) => sum + val * val, 0) / data.length);
        // For me this helps, have to test other mics or normalization methods.
        rms = Math.min(1, rms * 5)
        setAudioRms(rms);
        const threshold = rmsThreshold / 100; // Adjust this threshold as needed

        if (autoRecord) {
          if (rms > threshold) {
            startRecording();
            if (silenceTimeout.current) { 
              clearTimeout(silenceTimeout.current);
              silenceTimeout.current = null;
            }

          } else if (rms <= threshold && recording) {
            if (!silenceTimeout.current) {
              silenceTimeout.current = setTimeout(stopRecording, 1000); // Adjust this timeout as needed
            }
          }
        }
      };
    }

    const startRecording = () => {
      if (recording) {
        return;
      }
      const stream = streamRef.current;
      const mediaRecorder = new MediaRecorder(stream);
  
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
  
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await saveAudio(audioBlob);
        audioChunksRef.current = [];
      };
  
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setRecording(true);
    }

    const stopRecording = () => {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearTimeout(silenceTimeout.current);
      silenceTimeout.current = null;
    }

    const saveAudio = async (blob: Blob) => {
      if (uploadedFiles.length > 0) {
        toast({
          title: "Can only attach one file at a time",
        })
        return;
      }
      // Function to convert blob to base64
      const blobToDataURL = (blob) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      const audioUrl = await blobToDataURL(blob);

      const db = await openDB('llmplayground-files', 1);
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');

      const id = await store.add({ type: blob.type, payload: audioUrl });
      const newFile = {
        id: id,
        type: blob.type,
        payload: audioUrl
      }
      setUploadedFiles(prevFiles => [...prevFiles, newFile]);
    }

    const handleKeyup = (event) => {

        if (event.key === 'Enter' && !event.shiftKey) {
            submitPrompt();
        }
    }

    const abortCompletion = () => {
      if (cancel_callback.current) {
        cancel_callback.current()
      }
    }

    const submitPrompt = async () => {
      if (generating) {
          return;
      }
      if (!modelsStateContext.find(x => x.selected)) {
        showDialog({
          title: "No model selected",
          message: "Please select a model",
        })
        return;
      }


      //let newMessages : ChatMessage[] = [...chatContext.conversations[chatContext.activeConversation].messages];
      let newMessages : ChatMessage[] = chatContext.convos[chatContext.activeConvo].messages;

      if ((!!textAreaVal && (textAreaVal.trim().length > 0)) || uploadedFiles.length > 0) {
          newMessages = [...chatContext.convos[chatContext.activeConvo].messages, {
              role: Role.USER,
              content: textAreaVal,
              date: new Date(),
              attachments: uploadedFiles.map(file => {
                return {
                  type:file.type,
                  id: file.id
                }
              })

          }]
          updateMessages(newMessages);
          setTextAreaVal('');
        } 

        setGenerating(true);


        const messagesWithAttachmentsLoaded = await Promise.all(
          newMessages.map(async (message) => {
            let attachments = undefined;
            if (message.attachments && message.attachments.length > 0) {
              attachments = await Promise.all(
                message.attachments.map(async (file) => {
                  const db = await openDB('llmplayground-files', 1);
                  const tx = db.transaction('files', 'readonly');
                  const store = tx.objectStore('files');
                  const fileData = await store.get(file.id);
                  return {
                    type: fileData.type,
                    payload : fileData.payload
                  };
                })
              );
            }
            return {
              content: message.content,
              role: message.role,
              attachments: attachments,
            };
          })
        );


        const _cancel_callback = apiContext.Inference.textCompletionRequest({
        messages:messagesWithAttachmentsLoaded,
        models: modelsStateContext.map((modelState) => {
            if(modelState.selected) {
                return modelState
                }
            }).filter(Boolean)
        })

        cancel_callback.current = _cancel_callback
        setUploadedFiles([]);      
  }


    const updateMessages = (newMessages: ChatMessage[]) => {
      let newConvos = [...chatContext.convos];
      newConvos[chatContext.activeConvo].messages = newMessages
      setChatContext({
        ...chatContext,
        convos : newConvos
      })
    }

    
    const updateSystemMessage = (val: string) => {
      if (systemMessage) {
        systemMessage.content = val;
      } else {
        chatContext.convos[chatContext.activeConvo].messages.unshift({
          role: Role.SYSTEM,
          content: val
        })
      }

      updateMessages(chatContext.convos[chatContext.activeConvo].messages);
    }


    const clearContext = () => {
      updateMessages([]);
    }

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      if (uploadedFiles.length > 0 || Array.from(e.dataTransfer.files).length > 1) {
        toast({
          title: "Can only attach one file at a time",
        })
        return;
      }
      const files = Array.from(e.dataTransfer.files).filter(file => {
        return file.type.startsWith('image/') || file.type.startsWith('audio/')
      });


      const newFiles = await Promise.all(files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async () => {
            const db = await openDB('llmplayground-files', 1);
            const tx = db.transaction('files', 'readwrite');
            const store = tx.objectStore('files');
            const id = await store.add({ type: file.type, payload: reader.result });
            resolve({ id, type: file.type, payload: reader.result });
          };
          reader.onerror = error => reject(error);
          reader.readAsDataURL(file);
        });
      }));

      setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
    };

    useEffect(() => {
        let convo = chatContext.convos[chatContext.activeConvo];
        
        systemMessage = convo.messages.find(x => x.role === Role.SYSTEM);

        if (scrollRef.current) {
            const scrollEl = scrollRef.current
            scrollEl.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight
        }

        const completionCallback = ({event, data, meta}) => {
          switch (event) {
            case "cancel":
                setGenerating(false)
            break;
    
            case "close":
                if (!meta.error)
                setGenerating(false)
            break;
    
            case "completion":
                let currentMessage = convo.messages[convo.messages.length-1];
                let newMessages = [...convo.messages];
                if (currentMessage.role === Role.USER) {
                    currentMessage = {
                        role: Role.ASSISTANT,
                        content: ''
                    }
                    newMessages.push(currentMessage);
                }
                data[Object.keys(data)[0]].forEach(x => {
                    currentMessage.content += x.message;
                });
                currentMessage.date = new Date();
                updateMessages(newMessages);
                //setChatContext({messages:newMessages})

            break;
    
            case "status":
              const {message} = data
              if (message.indexOf("[ERROR] ") === 0) {
                showDialog({
                  title: "Model Error",
                  message: message.replace("[ERROR] ", ""),
                })
              }
            break;
    
            case "error":
              switch(data) {
                case "Too many pending requests":
                  showDialog({
                    title: "Too many pending requests",
                    message: "Please wait a few seconds before trying again.",
                  })
                break;
    
                case "Too many daily completions":
                  showDialog({
                    title: "Daily limit reached",
                    message: "It seems you've reached your daily limit of completions. Please try again tomorrow.",
                  })
                break;
    
                case "Unauthorized":
                  showDialog({
                    title: "Unauthorized",
                    message: "Please log in to use this feature.",
                  })
                break;
    
                default:
                  console.log("default error handling?")
                  showDialog({
                    title: "Error",
                    message: data,
                  })
                break;
              }
            break;
    
            default:
              console.log("Unknown event", event, data);
            break;
          }
        }

        apiContext.Inference.subscribeTextCompletion(completionCallback)
    
        return () => {
          apiContext.Inference.unsubscribeTextCompletion(completionCallback);
        };
    }, [chatContext.convos]);

    return (
    <div className="flex flex-col h-full">
      <NavBar tab="chat">
        <div className="align-middle mt-1">
          <div className="flex basis-full my-2 lg:mb-0 space-x-2">
            {false}
            {/*(!isMobile) ? mobileOpenHistoryButton : null */}
          </div>
        </div>
      </NavBar>
      <CustomAlertDialogue dialog = {dialog} />

      <div className="flex flex-grow flex-col font-display min-h-0 min-w-0 ml-5">

        <div className="flex flex-row space-x-4 flex-grow min-h-0 min-w-0">
            <div className="convos-panel-container">
              {!convosVisible && <Button
                className="convos-button"
                onClick={(e) => {
                  setConvosVisible(!convosVisible);
                }}
              ><History></History></Button>}
              {convosVisible && <Button
                className="close-convos-button"
                onClick={(e) => {
                  setConvosVisible(!convosVisible);
                }}
              ><X></X></Button>}
              {convosVisible && 
                <div>
                  <Convos />
                </div>}
            </div>
            <div
                id=""
                className="flex flex-col grow basis-auto"
                style={{flex:1}}
            >
                <div className="chat-mainarea">
                    <div className="chat-systemmessage">

                      <span>System</span>
                      <Input
                        type={"text"}
                        placeholder={`Enter system message (optional)`}
                        value={!!systemMessage ? systemMessage.content : ""}
                        onChange={(e) => updateSystemMessage(e.target.value)}
                        className="flex text-left placeholder:text-left h-8 w-full rounded-md border border-slate-300 bg-transparent py-2 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900"
                      />
                    </div>
                    <div 
                        className="chat-messagearea"
                        ref={scrollRef}
                    >
                        {
                            chatContext.convos[chatContext.activeConvo].messages
                            .filter(x => x.role !== Role.SYSTEM)
                            .map(x => {
                                return <ChatMessage 
                                  role = {x.role} 
                                  content = {x.content} 
                                  files = {x.attachments}
                                  date = {x.date}
                                  generating = {generating}
                                  updateMessageCallback={(newVal: string) => {
                                    x.content = newVal
                                    updateMessages(chatContext.convos[chatContext.activeConvo].messages);
                                    //setChatContext({messages:chatContext.messages})
                                  }}
                                  deleteMessageCallback={(e) => {
                                    updateMessages(chatContext.convos[chatContext.activeConvo].messages
                                      .filter(message => message !== x)
                                    );

                                    /*setChatContext({
                                      messages:chatContext.messages.filter(message => message !== x)
                                    })*/
                                  }}  
                                />
                            })    
                        }
                    </div>
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                        <div className={"images-container"}>
                        {uploadedFiles.map((file, index) => {
                          const renderFile = () => {
                            if (file.type.startsWith('image/')) {
                              return <img key={index} src={file.payload} alt="preview" className={"images-preview"} />
                            }
                            if (file.type.startsWith('audio/')) {
                              return (
                                  <div key={index} style={{ margin: '10px' }}>
                                    <audio controls>
                                      <source src={file.payload} type={file.type} />
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                );
                            }
                          };

                          return (
                              <div key={index} style={{ margin: '10px', position: 'relative' }}>
                                  <button 
                                      onClick={() => setUploadedFiles([])} 
                                      className={"remove-attachment-button"}
                                  >
                                      <X></X>
                                  </button>
                                  {renderFile()}
                              </div>
                          );
                    })}
                        </div>
                        <textarea
                            className="chat-textarea"
                            value={textAreaVal}
                            onChange={e => setTextAreaVal(e.target.value)}
                            onKeyUp={handleKeyup}
                        ></textarea>
                    </div>

                    <div className="chat-buttonarea">
                        <Button
                          variant="default"
                          className="bg-emerald-500 hover:bg-emerald-700 inline-flex items-center mt-4 text-sm font-medium text-center"
                          type="submit"
                          value="submit"
                          disabled={generating}
                          onClick={e => submitPrompt()}
                        >
                          Submit
                        </Button>
                        <Button
                            type="button"
                            variant="subtle"
                            className="inline-flex items-center mt-4 text-sm font-medium text-center"
                            onClick={e => clearContext()}
                            disabled={chatContext.convos[chatContext.activeConvo].messages.length === 0}
                            >
                                Clear
                        </Button>
                        {(generating && <Button
                            type="button"
                            variant="subtle"
                            className="inline-flex items-center mt-4 text-sm font-medium text-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              abortCompletion()
                            }}
                          >
                            {" "}
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancel Generation
                          </Button>
                        )}
                        {<AudioDisplay
                          volume={audioRms}
                          threshold={rmsThreshold}
                          recording={recording}
                          onThresholdChange={setRmsThreshold}
                          audioOn={audioOn}
                          setAudioOn={setAudioOn}
                          autoRecord={autoRecord}
                          setAutoRecord={setAutoRecord}
                          startRecording={startRecording}
                          stopRecording={stopRecording}
                        >

                        </AudioDisplay>}
                    </div>
                </div>
            </div>
            
            {<div className="hidden p-1 grow-0 shrink-0 basis-auto lg:block settings-container">
              {!paramsVisible && <Button
                className="settings-button"
                onClick={(e) => {
                  setParamsVisible(!paramsVisible);
                }}
              >
                <Settings></Settings>
              </Button>}
              {paramsVisible && <Button
                className="close-settings-button"
                onClick={(e) => {
                  setParamsVisible(!paramsVisible);
                }}
              >
                <X></X>
              </Button>}
              {paramsVisible && 
              <div className="lg:w-[230px]">
                {parameterSidebar}
              </div>
              }
            </div>}
            </div>
        </div>
    </div>
    );
}

