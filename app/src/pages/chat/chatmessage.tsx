import { ClipboardCopy, Edit, Trash } from "lucide-react";
import { Role } from "../chat"
import { useToast } from "../../hooks/ui/use-toast"
import { Button } from "../../components/ui/button"
import { useEffect, useState } from "react";
import moment from 'moment'
import { openDB } from 'idb';

export const ChatMessage = ({
    role, 
    content, 
    files,
    generating,
    date,
    updateMessageCallback,
    deleteMessageCallback
}) => {
    let roleClass = (role === Role.USER ? "user" : "assistant")
    const [editing, setEditing] = useState(false);
    const { toast } = useToast()
    const [fileData, setFileData] = useState([]);

    useEffect(() => {
        const fetchImages = async () => {
          const db = await openDB('llmplayground-files', 1);
          const tx = db.transaction('files', 'readonly');
          const store = tx.objectStore('files');
          const filePromises = files.map(file => store.get(file.id));
    
          Promise.all(filePromises)
            .then(files => {
                setFileData(files.filter(file => file !== undefined));
                console.log(fileData);
            })
            .catch(error => {
              console.error('Error fetching images from IndexedDB:', error);
            });
        };
        if (files && files.length > 0) {
            fetchImages();
        } else {
            setFileData([]);
        }
      }, [files]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        toast({
            title: "Message copied!",
        })
    };

    return (
        <div className={"chat-message"}>
            <div className="chat-message-role">
                <span>{role}</span>
                {date && <span className="chat-message-date">{moment(date).format("h:mm:ss")}</span>}
            </div>
            {!editing && <div className={"chat-message-content " + roleClass}>
                {
                    (!!fileData && fileData.length > 0) && <div className="images-container">
                        {fileData.map((file, index) => {
                            if (file.type.startsWith('image/')) {
                                return <img key={index} src={file.payload} alt="preview" style={{ maxWidth: '300px', maxHeight: '250px', margin: '10px' }} />
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
                        })}
                </div>
                }
                {content}
            </div>}
            {editing && <div className={roleClass}>
                <div 
                    contentEditable
                    className="chat-message-editing"
                    onBlur={(e) => {
                        updateMessageCallback(e.target.textContent)
                    }}
                    onKeyUp={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            updateMessageCallback(e.target.textContent)
                            setEditing(false)
                        }
                    }}
                >
                    {content}
                </div>
            </div>}
            {/*editing && <div className={roleClass}>
                <textarea
                className="chat-message-editing"
                value={content}
                >
                </textarea>
            </div>*/}

            <div className="chat-clipboardbutton-container">
                <Button
                    type="button"
                    variant="subtle"
                    className="chat-clipboardbutton"
                    onClick={(e) => {
                        copyToClipboard();
                    }}
                    >
                    <ClipboardCopy/>

                </Button>
                <Button
                    type="button"
                    variant="subtle"
                    className="chat-clipboardbutton"
                    disabled={generating}
                    onClick={(e) => {
                        setEditing(!editing);
                    }}
                    >
                    <Edit/>

                </Button>
                <Button
                    type="button"
                    variant="subtle"
                    className="chat-clipboardbutton"
                    disabled={generating}
                    onClick={(e) => {
                        deleteMessageCallback();
                    }}
                    >
                    <Trash/>

                </Button>
            </div>
        </div>
    )
}

