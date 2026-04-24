import { useParams } from 'next/navigation';
import { List, Typography } from '@mui/material';
import { useEmailContext } from 'providers/EmailProvider';
import EmailListItem from './email-list-item/EmailListItem';

// 🚀 EXPERT FIX: Accept the onEmailClick prop
const EmailList = ({ title, emails, onEmailClick }) => {
  const { resizableWidth } = useEmailContext();
  const { id } = useParams();

  return (
    <List
      disablePadding
      subheader={
        <Typography variant="subtitle2" sx={{ fontWeight: 700, px: 2 }}>
          {title}
        </Typography>
      }
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          px: 1,
        },
        (!id || resizableWidth > 500) && {
          px: { sm: 3 },
        },
      ]}
    >
      {emails.map((mail) => (
        <EmailListItem
          key={mail.id}
          mail={mail}
          onClick={() => onEmailClick(mail)}
        />
      ))}
    </List>
  );
};

export default EmailList;