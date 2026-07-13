import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { visuallyHidden } from '@mui/utils';
import { alpha } from '@mui/material/styles';
import CustomTablePaginationAction from '../../common/CustomTablePaginationAction';

import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';

const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
};

const getComparator = (order, orderBy) => {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
};

const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};

const EnhancedTableHead = (props) => {
    const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort, headCells } = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow>
                <TableCell padding="checkbox">
                    <Checkbox
                        color="primary"
                        indeterminate={numSelected > 0 && numSelected < rowCount}
                        checked={rowCount > 0 && numSelected === rowCount}
                        onChange={onSelectAllClick}
                    />
                </TableCell>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component="span" sx={visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </Box>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
};

const EnhancedTableToolbar = (props) => {
    const { numSelected, title } = props;

    return (
        <Toolbar
            sx={{
                pl: { sm: 2 },
                pr: { xs: 1, sm: 1 },
                ...(numSelected > 0 && {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
                }),
            }}
        >
            {numSelected > 0 ? (
                <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1" component="div">
                    {numSelected} selected
                </Typography>
            ) : (
                <Typography sx={{ flex: '1 1 100%' }} variant="h6" id="tableTitle" component="div">
                    {title}
                </Typography>
            )}

            {numSelected > 0 ? (
                <Tooltip title="Delete">
                    <IconButton><DeleteIcon /></IconButton>
                </Tooltip>
            ) : (
                <Tooltip title="Filter list">
                    <IconButton><FilterListIcon /></IconButton>
                </Tooltip>
            )}
        </Toolbar>
    );
};

// ============================================================================
// MAIN COMPONENT 
// ============================================================================
export function EnhancedTable({ 
    title = "Data Table", 
    headCells = [], 
    rows = [], 
    uniqueKey = "id", 
    defaultSort = "id", 
    onRowClick
}) {
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState(defaultSort);
    const [selected, setSelected] = useState([]);
    const [page, setPage] = useState(0);
    const [dense, setDense] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = rows.map((n) => n[uniqueKey]);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }
        setSelected(newSelected);
    };

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleChangeDense = (event) => setDense(event.target.checked);

    const isSelected = (id) => selected.indexOf(id) !== -1;
    const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

    const visibleRows = useMemo(
        () => stableSort(rows, getComparator(order, orderBy)).slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
        ),
        [rows, order, orderBy, page, rowsPerPage],
    );

    return (
        <Box sx={{ width: '100%', px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
            <Box sx={{ width: '100%', mb: 2 }}>
                <EnhancedTableToolbar numSelected={selected.length} title={title} />
                <TableContainer>
                    <Table sx={{ minWidth: 750 }} size={dense ? 'small' : 'medium'}>
                        <EnhancedTableHead
                            numSelected={selected.length}
                            order={order}
                            orderBy={orderBy}
                            onSelectAllClick={handleSelectAllClick}
                            onRequestSort={handleRequestSort}
                            rowCount={rows.length}
                            headCells={headCells} 
                        />
                        <TableBody>
                            {visibleRows.map((row, index) => {
                                const rowId = row[uniqueKey];
                                const isItemSelected = isSelected(rowId);
                                const labelId = `enhanced-table-checkbox-${index}`;

                                return (
                                    <TableRow
                                        hover
                                        onClick={(event) => onRowClick ? onRowClick(row) : handleClick(event, rowId)}
                                        role="checkbox"
                                        aria-checked={isItemSelected}
                                        tabIndex={-1}
                                        key={rowId}
                                        selected={isItemSelected}
                                        sx={{ cursor: 'pointer', '&:last-of-type td, &:last-of-type th': { border: 0 } }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                color="primary"
                                                checked={isItemSelected}
                                                inputProps={{ 'aria-labelledby': labelId }}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleClick(event, rowId);
                                                }}
                                            />
                                        </TableCell>
                                        
                                        {headCells.map((col) => (
                                            <TableCell key={col.id} align={col.numeric ? 'right' : 'left'}>
                                                {col.render ? col.render(row[col.id], row) : row[col.id]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                            {emptyRows > 0 && (
                                <TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}>
                                    <TableCell colSpan={headCells.length + 1} />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={rows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    ActionsComponent={(props) => 
                        <CustomTablePaginationAction 
                            {...props} 
                            onPrevClick={() => handleChangePage(null, page - 1)} 
                            onNextClick={() => handleChangePage(null, page + 1)}
                        />
                    }
                />
            </Box>
            <FormControlLabel
                control={<Switch checked={dense} onChange={handleChangeDense} />}
                label="Dense padding"
                sx={{ ml: 1 }}
            />
        </Box>
    );
}