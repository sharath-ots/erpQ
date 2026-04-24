import { Stack } from '@mui/material';
import { recentProjects, userProjects, sharedProjects } from 'data/kanban/kanban/boards';
import BoardsSlider from 'components/crm-board/kanban/boards/boards-slider/BoardsSlider';
import KanbanBoardsHeader from 'components/crm-board/kanban/boards/page-header/KanbanBoardsHeader';

const KanbanBoards = () => {
  return (
    <>
      <KanbanBoardsHeader />
      <Stack direction="column">
        <BoardsSlider boardList={recentProjects} size="small" />
        <BoardsSlider boardList={userProjects} />
        <BoardsSlider boardList={sharedProjects} />
      </Stack>
    </>
  );
};

export default KanbanBoards;
