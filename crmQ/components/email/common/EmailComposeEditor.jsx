import React, { useRef, useEffect } from 'react';
import { Button } from '@mui/material';
import { Box, ButtonGroup, Stack, toggleButtonClasses } from '@mui/material';
import Editor, { editorDefaultToolbar } from 'components/base/Editor';

const EmailComposeEditor = ({ onChange, content, isValid }) => {
  const rteRef = useRef(null);

  // 🚀 EXPERT FIX: Force the Rich Text Editor to sync with external changes!
  useEffect(() => {
    if (rteRef.current && rteRef.current.editor) {
      const currentEditorHTML = rteRef.current.editor.getHTML();

      // Only force an update if the incoming HTML is actually different,
      // otherwise the cursor jumps to the end of the line while typing.
      if (content !== currentEditorHTML) {
        rteRef.current.editor.commands.setContent(content || '');
      }
    }
  }, [content]);

  return (
    <Editor
      ref={rteRef}
      placeholder="Write a message"
      onChange={onChange}
      content={content}
      renderControls={() => (
        <Stack
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            columnGap: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              overflowX: 'auto',
              '& > div:first-of-type': {
                flexWrap: 'nowrap',
              },
            }}
          >
            {editorDefaultToolbar()}
          </Box>
          <ButtonGroup variant="contained" sx={{ ml: 'auto' }}>
            <Button sx={{ borderRight: '0 !important' }} type="submit">
              Send
            </Button>
          </ButtonGroup>
        </Stack>
      )}
      sx={{
        display: 'flex',
        flexDirection: 'column-reverse',
        bgcolor: 'transparent',
        '&:hover': {
          bgcolor: 'unset',
        },
        '& .MuiTiptap-RichTextContent-root': {
          minHeight: 300,
          height: 1,
          overflow: 'auto',
          mb: 3,
          borderRadius: 2,
          borderWidth: '1px !important',
          borderStyle: 'solid',
          borderColor: 'transparent',
          bgcolor: !isValid ? 'error.lighter' : 'background.elevation2',
          '&:hover': {
            bgcolor: isValid ? 'background.elevation3' : 'error.lighter',
          },
        },
        '&.MuiTiptap-FieldContainer-focused': {
          bgcolor: 'unset',
          '.MuiTiptap-FieldContainer-notchedOutline': {
            border: 0,
          },
          '& .MuiTiptap-RichTextContent-root': {
            bgcolor: !isValid ? 'error.lighter' : 'primary.lighter',
            borderRadius: 2,
            borderColor: !isValid ? 'error.main' : 'primary.main',
            '&:hover': {
              bgcolor: !isValid ? 'error.lighter' : 'primary.lighter',
            },
          },
        },
        '& .MuiTiptap-MenuBar-root': {
          bgcolor: 'unset',
          border: 'none',
          [`& .${toggleButtonClasses.root}`]: {
            color: 'neutral.dark',
            [`&:hover, &.${toggleButtonClasses.selected}`]: {
              bgcolor: 'background.elevation4',
            },
          },
          '& .MuiTiptap-RichTextField-content': {
            padding: 0,
          },
        },
      }}
    />
  );
};

export default EmailComposeEditor;