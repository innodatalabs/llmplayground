import { Check, ClipboardCopy, Edit, Pencil, Trash, X } from "lucide-react";
import { Role } from "../chat"
import { useToast } from "../../hooks/ui/use-toast"
import { Button } from "../../components/ui/button"
import { useContext, useRef, useState } from "react";
import moment from 'moment'
import { PromptGenContext } from "../../app";

export const IntentEntry = ({
    intent, 
    index, 
}) => {
    const {promptgenContext, setPromptgenContext} = useContext(PromptGenContext)

    const [editing, setEditing] = useState(false);

    const [tempName, setTempName] = useState("")

    const divRef = useRef(null);

    const updateIntentName = () => {
        const updatedIntents = [...promptgenContext.intents]; 
        const updatedIntent = { ...updatedIntents[index], intent: tempName }; 
        updatedIntents[index] = updatedIntent; 

        setPromptgenContext(
            { ...promptgenContext, 
                intents: updatedIntents 
            }
        );
    }
    const { toast } = useToast()
    return (
        <div className="convo-entry-wrapper">
            <div 
                className={"convo-entry" + (promptgenContext.activeIntent === index ? " selected" : "")}
                ref={divRef}
                contentEditable={editing}
                suppressContentEditableWarning={true}
                onBlur={(e) => {
                    if (editing && tempName) {
                        updateIntentName();
                        setEditing(false);
                    }
                }}
                onKeyUp={(e) => {
                    if (e.key != 'Enter') {
                        setTempName(e.target.textContent)
                    } else {
                        updateIntentName();
                        setEditing(false);
                    }
                }}

            
                onClick={(e) => {
                    if (promptgenContext.activeIntent != index) {
                        setEditing(false)
                        setPromptgenContext({
                            ...promptgenContext,
                            activeIntent : index
                        })
                    } else {
                        setEditing(true)
                        divRef.current.focus();
                    }
                }}
            >
                {intent}
            </div>
            <div 
                className="convo-entry-contextMenu"
            >
                
                <Button
                    onClick={(e) => {
                        const updatedIntents = [...promptgenContext.intents]; 
                        let newIndex = promptgenContext.activeIntent

                        if (updatedIntents.length > 1) {
                            updatedIntents.splice(index, 1);
                            if (promptgenContext.activeIntent === index) {
                                newIndex = 0;
                            }
                        }
                        setPromptgenContext(
                            { ...promptgenContext, 
                                intents: updatedIntents, 
                                activeIntent: newIndex
                            }
                        );    
                    }}
                >
                    <Trash></Trash>
                </Button>       
            </div>
        </div>
    )
}

