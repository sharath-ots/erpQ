import { useState } from 'react';
import { Box } from '@mui/material';
import EmailAccordion from './EmailAccordion';
import EmailComposeDialog from './EmailComposeDialog';

const EmailHistory = ({ emails }) => {
    // 1️⃣ State to control if the popup is visible
    const [openCompose, setOpenCompose] = useState(false);

    // 2️⃣ State to store the Reply data (To: salesq@cityq.biz, etc.)
    const [composeData, setComposeData] = useState({
        to: '',
        subject: '',
        body: '',
        sender: ''
    });

    const handleReplyToCompose = (data) => {
        setComposeData(data); // Pre-fills the fields
        setOpenCompose(true);  // Opens the popup
    };

    return (
        <Box sx={{ p: 2, position: 'relative' }}>
            {/* --- The List of Emails --- */}
            {emails?.map((email) => (
                <EmailAccordion
                    key={email.id || Math.random()}
                    email={email}
                    onReply={handleReplyToCompose} // 🚀 Passing the "Link" function
                />
            ))}

            {/* --- The Sticky Popup Dialog --- */}
            <EmailComposeDialog
                open={openCompose}
                handleClose={() => setOpenCompose(false)}
                initialData={composeData} // 🚀 Passing the pre-filled data
            />
        </Box>
    );
};

export default EmailHistory;