import { useContext } from "react";
import { ChatContext } from "../../app";
import { Button } from "../../components/ui/button";
import { ConvoEntry } from "./convoentry";

export const Convos = ({
}) => {
    const {chatContext, setChatContext} = useContext(ChatContext)

    return <div className="lg:w-[230px]">
        <div className="convos-container">
            <div>
                <Button
                    variant="default"
                    className="bg-emerald-500 hover:bg-emerald-700 inline-flex items-center mt-4 text-sm font-medium text-center"
                    onClick={e => {
                        let newConvos = [
                            {
                                name: "[Untitled Chat]",
                                messages: []
                            },
                            ...chatContext.convos
                        ]
                        setChatContext({
                            ...chatContext,
                            convos: newConvos
                        })
                    }}
                >
                    New Chat
                </Button>
            </div>
            <div className="convos-list">
                {chatContext.convos.map((convo, index) => {
                    return <ConvoEntry
                        name={convo.name}
                        index={index}
                    />
                })
            }
            </div>
        </div>
    </div>
}