import {escapeHTML} from './escape-html';
import {h} from './jsx-runtime';

export function make_friends_list() {
    try {
        const getRandomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const friendHTML = ({avatar, href, title, description}: any) => (

            <div class="friend-link-card">
                <aside class="friend-link-avatar">
                    {avatar ? (
                        <img
                            src={escapeHTML(avatar)}
                            onerror={(e) => {
                                const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                                e.target.replaceWith(<div class="avatar-placeholder"
                                                          style={`background-color: ${color}`}/>);
                            }}
                        />
                    ) : (
                        <div class="avatar-placeholder" style={`background-color: ${getRandomColor()}`}/>
                    )}
                </aside>
                <div class="friend-link-content">
                    <div class="friend-link-title">
                        <a href={escapeHTML(href)}>{escapeHTML(title)}</a>
                    </div>
                    <div class="friend-link-description">{escapeHTML(description)}</div>
                </div>
            </div>

        );

        document.querySelectorAll('.friend-link').forEach((friend) => {
            friend.replaceWith(friendHTML((friend as HTMLElement).dataset));
        });
    } catch (err) {
        console.error(err);
    }
}
