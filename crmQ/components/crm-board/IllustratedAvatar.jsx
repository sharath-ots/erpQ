import React from 'react';
import Avatar from 'boring-avatars';

// You can customize these colors to match your brand/template!
const avatarColors = ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];

const IllustratedAvatar = ({ name, size = 32, variant = "beam" }) => {
  return (
    <Avatar
      size={size}
      name={name} // This is the "seed". Same name = same avatar every time!
      variant={variant} 
      colors={avatarColors}
    />
  );
};

export default IllustratedAvatar;