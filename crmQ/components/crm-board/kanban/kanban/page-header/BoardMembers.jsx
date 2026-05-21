import AvatarGroup from '@mui/material/AvatarGroup';
import Tooltip from '@mui/material/Tooltip';
// Import the new component you just created!
import IllustratedAvatar from '../../../IllustratedAvatar'
const BoardMembers = ({ members }) => {
  if (!members || members.length === 0) return null;

  return (
    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, border: 'none' } }}>
      {members.map((member) => (
        <Tooltip key={member.id} title={member.name || member.id} arrow>
          {/* We wrap it in a div so AvatarGroup can still count and group them properly */}
          <div style={{ borderRadius: '50%', overflow: 'hidden', width: 32, height: 32, border: '2px solid white', marginLeft: -8 }}>
             <IllustratedAvatar name={member.avatarSeed || member.id} size={32} />
          </div>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
};

export default BoardMembers;