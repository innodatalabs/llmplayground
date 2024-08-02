import { useContext } from "react";
import { PromptGenContext } from "../../app";
import { Button } from "../../components/ui/button";
import { IntentEntry } from "./intententry";

export const Intents = ({
}) => {
    const {promptgenContext, setPromptgenContext} = useContext(PromptGenContext)

    return <div className="lg:w-[230px]">
        <div className="convos-container">
            <div>
                <Button
                    variant="default"
                    className="bg-emerald-500 hover:bg-emerald-700 inline-flex items-center mt-4 text-sm font-medium text-center"
                    onClick={e => {
                        let newIntents = [
                            {
                                intent: "[No Intent]",
                                prompt: "",
                                generations: []
                            },
                            ...promptgenContext.intents
                        ]
                        setPromptgenContext({
                            ...promptgenContext,
                            intents: newIntents
                        })
                    }}
                >
                    New Intent
                </Button>
            </div>
            <div className="convos-list">
                {promptgenContext.intents.map((intent, index) => {
                    return <IntentEntry
                        intent={intent.intent}
                        index={index}
                    />
                })
            }
            </div>
        </div>
    </div>
}