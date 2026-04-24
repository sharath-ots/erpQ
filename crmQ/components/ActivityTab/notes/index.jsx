import { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import { inputBaseClasses } from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SimpleBar from 'components/base/SimpleBar';
import StyledTextField from 'components/styled/StyledTextField';
import Note from './Note';

const NotesTabPanel = ({ leadId }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 FETCH NOTES FROM BACKEND
  const fetchNotes = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lead-notes?lead_id=${leadId}`);

      // 🚀 EXPERT FIX: Read the exact error message from the server
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend Error ${res.status}: ${errorText}`);
      }

      const rawData = await res.json();

      const formattedNotes = rawData.map(item => ({
        id: item.name,
        title: 'Note',
        description: item.content || item.note,
        createdAt: item.creation,
        author: {
          name: item.owner || 'User',
          avatar: ''
        }
      }));

      setNotes(formattedNotes);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [leadId]);

  // 🚀 HANDLE CREATE NOTE (Triggered on Enter)
  const handleKeyDown = async (e) => {
    // If user presses Enter WITHOUT holding Shift, submit the note
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents adding a new line

      if (!newNote.trim()) return; // Don't submit empty notes

      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/lead-notes?lead_id=${leadId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newNote,
            reference_doctype: 'Lead',
            reference_name: leadId
          })
        });

        if (res.ok) {
          setNewNote(''); // Clear the input
          fetchNotes(); // Refresh the list
        }
      } catch (error) {
        console.error("Error saving note:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Container maxWidth={false} sx={{ maxWidth: 800, px: { xs: 0 } }}>
      <StyledTextField
        multiline
        rows={4}
        placeholder="Write & press enter to save..."
        fullWidth
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
        sx={{
          mb: 1,
          bgcolor: isSubmitting ? '#f8fafc' : 'white',
          [`& .${inputBaseClasses.root}.${inputBaseClasses.multiline}`]: {
            py: 1.5,
            px: 2
          },
        }}
      />

      <SimpleBar sx={{ maxHeight: 504 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : notes.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">No notes added yet.</Typography>
          </Box>
        ) : (
          <Stack
            direction="column"
            divider={<Divider sx={{ borderColor: 'dividerLight' }} />}
            sx={{ borderBottom: 1, borderColor: 'dividerLight' }}
          >
            {notes.map((note) => (
              <Note key={note.id} note={note} />
            ))}
          </Stack>
        )}
      </SimpleBar>

      {/* {notes.length > 0 && <Button sx={{ mt: 3 }}>Load more notes</Button>} */}
    </Container>
  );
};

export default NotesTabPanel;