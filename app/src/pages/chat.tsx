import { Loader2 } from "lucide-react";
import React, { useContext, useEffect, useRef, useState } from "react";
import { APIContext, ChatContext, ModelsStateContext } from "../app";
import NavBar from "../components/navbar";
import ParametersSidePanel from "../components/parameters-side-panel";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { ChatMessage } from "./chat/chatmessage";

export enum Role {
    USER = "user",
    ASSISTANT = "assistant"
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
    const {chatContext, _setChatContext} = useContext(ChatContext)
    const parameterSidebar = (<ParametersSidePanel showModelDropdown={true} showModelList ={false} />)
    const [textAreaVal, setTextAreaVal] = useState(''); // Declare a state variable...
    const {modelsStateContext} = useContext(ModelsStateContext)
    const cancel_callback = React.useRef<any>(null)
    const scrollRef = useRef(null)


    const [generating, setGenerating] = React.useState<boolean>(false);


    const [dialog, showDialog] = React.useState({
      title: "",
      message: ""
    })

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
  

    const submitPrompt = () => {
        if (generating) {
            return;
        }
        if (!modelsStateContext.find(x => x.selected)) {
            alert("Select a model");
            return;
        }

        if (!!textAreaVal && (textAreaVal.trim().length > 0)) {
            let newMessages = [...chatContext.messages, {
                role: Role.USER,
                content: textAreaVal
            }]
            _setChatContext({
                messages : newMessages
            })
            setTextAreaVal('');

            let prompt = newMessages
            .map(x => {
                let line = ''
                if (x.role === Role.USER) {
                    line += "User : ";
                } else {
                  if (!x.content.startsWith("Bot : ")) {
                    line += "Bot : ";
                  }
                }
                line += x.content;
                line += '\n\n';
                return line;
            })
            .join("");
            
            console.log(prompt);
            setGenerating(true);

            const _cancel_callback = apiContext.Inference.textCompletionRequest({
            prompt: prompt,
            models: modelsStateContext.map((modelState) => {
                if(modelState.selected) {
                    return modelState
                    }
                }).filter(Boolean)
            })

            cancel_callback.current = _cancel_callback
        }
    }

    const clearContext = () => {
        chatContext.messages.splice();
        _setChatContext({
            messages : []
        })
    }

    useEffect(() => {
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
                let currentMessage = chatContext.messages[chatContext.messages.length-1];
                let newMessages = [...chatContext.messages];
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
                _setChatContext({messages:newMessages})

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
    }, [chatContext.messages]);

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
        <div className="flex flex-row space-x-4 flex-grow mr-5 min-h-0 min-w-0">

            <div
                id=""
                className="flex flex-col grow basis-auto lg:max-w-[calc(100%-266px)]"
            >
                <div className="chat-mainarea">
                    <div 
                        className="chat-messagearea"
                        ref={scrollRef}
                    >
                        {
                            chatContext.messages.map(x => {
                                return <ChatMessage role = {x.role} content = {x.content} />
                            })    
                        }
                    </div>
                    <div>
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
                            disabled={chatContext.messages.length === 0}
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
                    </div>
                </div>
            </div>
            
            <div className="hidden p-1 grow-0 shrink-0 basis-auto lg:w-[250px] overflow-auto lg:block">
                    {parameterSidebar}
            </div>
            </div>
        </div>
    </div>
    );
}

