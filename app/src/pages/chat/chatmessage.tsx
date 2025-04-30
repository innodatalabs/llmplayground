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
    images,
    generating,
    date,
    updateMessageCallback,
    deleteMessageCallback
}) => {
    let roleClass = (role === Role.USER ? "user" : "assistant")
    const [editing, setEditing] = useState(false);
    const { toast } = useToast()
    const [imageData, setImageData] = useState([]);

    useEffect(() => {
        const fetchImages = async () => {
          const db = await openDB('llmplayground-images', 1);
          const tx = db.transaction('images', 'readonly');
          const store = tx.objectStore('images');
          const imagePromises = images.map(id => store.get(id));
    
          Promise.all(imagePromises)
            .then(images => {
              setImageData(images.filter(image => image !== undefined));
            })
            .catch(error => {
              console.error('Error fetching images from IndexedDB:', error);
            });
        };
        if (images && images.length > 0) {
            fetchImages();
        } else {
            setImageData([]);
        }
      }, [images]);

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
                    (!!imageData && imageData.length > 0) && <div className="images-container">
                        {imageData.map((image, index) => (
                            <img key={index} src={image.preview} alt="preview" style={{ maxWidth: '300px', maxHeight: '250px', margin: '10px' }} />
                        ))}
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

