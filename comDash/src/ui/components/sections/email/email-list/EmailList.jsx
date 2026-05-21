import { usePathname } from 'next/navigation';
import { List, Typography } from '@mui/material';
import { useEmailContext } from 'providers/EmailProvider';
import EmailListItem from './email-list-item/EmailListItem';

const EmailList = ({ title, emails }) => {
  const { resizableWidth } = useEmailContext();
  const pathname = usePathname();

  // 3. Split the string into an array and remove empty items
  const pathParts = pathname.split('/').filter(Boolean);

  // 4. Grab the last two items off the end of the array
  const id = pathParts.pop();      // Grabs the last item (e.g., '12345')
  const label = pathParts.pop();   // Grabs the second-to-last item (e.g., 'inbox')

  // 5. (Optional) Recreate the params object so you don't have to rewrite the rest of your file
  const params = { label, id };

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
        <EmailListItem key={mail.id} mail={mail} />
      ))}
    </List>
  );
};

export default EmailList;
