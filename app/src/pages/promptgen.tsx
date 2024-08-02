import { Loader2, ClipboardCopy, Settings, X, History } from "lucide-react";
import React, { useContext, useEffect, useRef, useState } from "react";
import { APIContext, ChatContext, ModelsStateContext, PromptGenContext } from "../app";
import NavBar from "../components/navbar";
import ParametersSidePanel from "../components/parameters-side-panel";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useToast } from "../hooks/ui/use-toast";
import { ChatMessage } from "./chat/chatmessage";
import { Convos } from "./chat/convos";
import { openDB } from 'idb';
import { Intents } from "./promptgen/intents";
import { GeneratedPrompt } from "./promptgen/generatedprompt";

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

export default function Promptgen() {
    const apiContext = useContext(APIContext)
    const {promptgenContext, setPromptgenContext} = useContext(PromptGenContext)

    const {chatContext, setChatContext} = useContext(ChatContext)
    const [paramsVisible, setParamsVisible] = React.useState<boolean>(true);
    const parameterSidebar = (<ParametersSidePanel showModelDropdown={true} showModelList ={false} setParamsVisible = {setParamsVisible}/>)
    const {modelsStateContext} = useContext(ModelsStateContext)
    const cancel_callback = React.useRef<any>(null)
    const scrollRef = useRef(null)
  
    let currentIntent = promptgenContext.intents[promptgenContext.activeIntent];

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

      if (!currentIntent.intent || !currentIntent.prompt) {
        return;
      }

      setGenerating(true);

      updateGenerations([...currentIntent.generations, ""]);

      const finalPrompt = currentIntent.prompt.replace("${intent}", currentIntent.intent);

      const _cancel_callback = apiContext.Inference.textCompletionRequest({
      prompt:finalPrompt,
      models: modelsStateContext.map((modelState) => {
          if(modelState.selected) {
              return modelState
              }
          }).filter(Boolean)
      })

      cancel_callback.current = _cancel_callback

  }


    const updateGenerations = (newGenerations : string[]) => {
      let newIntents = [...promptgenContext.intents];
      newIntents[promptgenContext.activeIntent].generations = newGenerations
      setPromptgenContext({
        ...promptgenContext,
        intents : newIntents
      })
    }

    const updateintent = (val: string) => {
      promptgenContext.intents[promptgenContext.activeIntent].intent = val
      setPromptgenContext({
        ...promptgenContext
      })
    }

    const updatePrompt = (val: string) => {
      promptgenContext.intents[promptgenContext.activeIntent].prompt = val
      setPromptgenContext({
        ...promptgenContext
      })
    }

    const clearContext = () => {
      updateGenerations([]);
    }

    useEffect(() => {
        //let intent = promptgenContext.intents[promptgenContext.activeIntent];
        
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
                let newGenerations = [...currentIntent.generations];
                let currentGen = newGenerations[newGenerations.length-1];

                data[Object.keys(data)[0]].forEach(x => {
                  newGenerations[newGenerations.length-1] += x.message;
                });

                updateGenerations(newGenerations);

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
    }, [promptgenContext.intents]);

    return (
    <div className="flex flex-col h-full">
      <NavBar tab="promptgen">
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
                  <Intents />
                </div>}
            </div>
            <div
                id=""
                className="flex flex-col grow basis-auto"
                style={{flex:1}}
            >
                <div className="chat-mainarea">
                    <div className="chat-systemmessage">

                      <span>Intent</span>
                      <Input
                        type={"text"}
                        placeholder={`Enter system message (optional)`}
                        value={currentIntent.intent}
                        onChange={(e) => updateintent(e.target.value)}
                        className="flex text-left placeholder:text-left h-8 w-full rounded-md border border-slate-300 bg-transparent py-2 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900"
                      />
                    </div>
                    <div 
                        className="chat-messagearea"
                        ref={scrollRef}
                    >
                        {
                            currentIntent.generations.map((x, index) => {
                                return <GeneratedPrompt 
                                  content={x}
                                  generating={generating}
                                  deleteMessageCallback={()=>{                                    
                                      updateGenerations(currentIntent.generations
                                        .filter((generation, genIndex) => genIndex !== index)
                                  );}}
                                />
                            })    
                        }
                    </div>
                    <div>
                        <textarea
                            className="promptgen-textarea"
                            value={currentIntent.prompt}
                            onChange={e => updatePrompt(e.target.value)}
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
                            disabled={currentIntent.generations.length === 0}
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

