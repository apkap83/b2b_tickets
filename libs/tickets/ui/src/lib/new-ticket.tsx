'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import TextField from '@mui/material/TextField';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';

import Select, { SelectChangeEvent } from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

import { TransitionProps } from '@mui/material/transitions';

import { DemoContainer, DemoItem } from '@mui/x-date-pickers/internals/demo';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import Divider from '@mui/material/Divider';

import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Typography, useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';
import {
  getTicketCategoriesForUserId,
  getServiceTypes,
} from '@b2b-tickets/server-actions';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export function NewTicketDialog() {
  const minWidth = '450px';
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [open, setOpen] = React.useState(false);
  const [ticketCategory, setTicketCategory] = React.useState('');

  const [serviceType, setServiceType] = React.useState('');

  const [ticketCategories, setticketCategories] = useState<
    { category_id: string; Category: string }[]
  >([{ category_id: '', Category: '' }]);

  const [serviceTypes, setServiceTypes] = useState<
    { service_id: string; 'Service Name': string }[]
  >([
    {
      service_id: '',
      'Service Name': '',
    },
  ]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    const getCategories = async () => {
      const rows = await getTicketCategoriesForUserId({ userId: 5 });
      setticketCategories(rows);
    };

    const getCurrentServiceTypes = async () => {
      const rows = await getServiceTypes();
      setServiceTypes(rows);
    };

    getCategories();
    getCurrentServiceTypes();
  }, []);

  return (
    <React.Fragment>
      <Button
        variant="contained"
        onClick={handleClickOpen}
        sx={{
          ':hover': {
            backgroundColor: 'black',
            color: 'white',
          },
        }}
      >
        Create New Ticket
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        keepMounted
        aria-describedby="alert-dialog-slide-description"
        PaperProps={{
          component: 'form',
          onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries((formData as any).entries());
            const title = formJson.title;
            console.log(title);
            handleClose();
          },
        }}
      >
        <DialogTitle variant="h2">New Ticket Form</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            {/* Let Google help apps determine location. This means sending
            anonymous location data to Google, even when no apps are running. */}
          </DialogContentText>
          <FormControl sx={{ minWidth: minWidth }}>
            <TextField
              autoFocus
              required
              margin="dense"
              id="title"
              name="title"
              label="Title"
              type="text"
              fullWidth
              variant="standard"
            />
          </FormControl>
          <FormControl sx={{ mt: '1.3rem', minWidth: minWidth }}>
            <InputLabel id="category">Category</InputLabel>
            <Select
              labelId="category"
              id="category"
              value={ticketCategory}
              onChange={(event: SelectChangeEvent) => {
                setTicketCategory(event.target.value);
              }}
              autoWidth
              label="Category"
            >
              <MenuItem
                value=""
                sx={{
                  minWidth: minWidth,
                }}
              >
                <em>None</em>
              </MenuItem>
              {ticketCategories.map((item) => {
                return (
                  <MenuItem key={item.category_id} value={item.category_id}>
                    {item.Category}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl sx={{ mt: '1.3rem', minWidth: minWidth }}>
            <InputLabel id="service_name">Service Name</InputLabel>
            <Select
              labelId="service_name"
              id="service_name"
              value={serviceType}
              onChange={(event: SelectChangeEvent) => {
                setServiceType(event.target.value);
              }}
              autoWidth
              label="Service Name"
            >
              <MenuItem
                value=""
                sx={{
                  minWidth: minWidth,
                }}
              >
                <em>None</em>
              </MenuItem>
              {serviceTypes.map((item) => {
                return (
                  <MenuItem key={item.service_id} value={item.service_id}>
                    {item['Service Name']}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: minWidth }}>
            <TextField
              autoFocus
              required
              margin="dense"
              id="title"
              name="title"
              label="Equipment ID"
              type="text"
              fullWidth
              variant="standard"
            />
          </FormControl>

          <FormControl
            sx={{
              minWidth: minWidth,
              display: 'flex',
              flexDirection: 'row',
              gap: '1.3rem',
            }}
          >
            <TextField
              autoFocus
              margin="dense"
              id="title"
              name="title"
              label="SID"
              type="text"
              variant="standard"
            />
            <TextField
              autoFocus
              margin="dense"
              id="title"
              name="title"
              label="CID"
              type="text"
              variant="standard"
            />
          </FormControl>

          <FormControl
            sx={{
              minWidth: minWidth,
              display: 'flex',
              flexDirection: 'row',
              gap: '1.3rem',
            }}
          >
            <TextField
              autoFocus
              margin="dense"
              id="title"
              name="title"
              label="User Name"
              type="text"
              variant="standard"
            />
            <TextField
              autoFocus
              margin="dense"
              id="title"
              name="title"
              label="CLI Value"
              type="text"
              variant="standard"
            />
          </FormControl>

          <FormControl sx={{ minWidth: minWidth }}>
            <TextField
              autoFocus
              required
              margin="dense"
              id="title"
              name="title"
              label="Contact Person"
              type="text"
              variant="standard"
            />
          </FormControl>

          <FormControl sx={{ minWidth: minWidth }}>
            <TextField
              autoFocus
              required
              margin="dense"
              id="title"
              name="title"
              label="Contact Phone Number"
              type="text"
              variant="standard"
            />
          </FormControl>

          <FormControl sx={{ minWidth: '150px' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoContainer
                components={[
                  'DatePicker',
                  'TimePicker',
                  'DateTimePicker',
                  'DateRangePicker',
                  'DateTimeRangePicker',
                ]}
              >
                <DemoItem
                  //   label={
                  //     <Label
                  //       componentName="DateTimePicker"
                  //       valueType="date time"
                  //     />
                  //   }
                  label={
                    <span style={{ marginBottom: '-10px' }}>
                      Occurence Date
                    </span>
                  }
                >
                  <DateTimePicker />
                </DemoItem>
              </DemoContainer>
            </LocalizationProvider>
          </FormControl>
        </DialogContent>
        <Divider color={`${colors.blueAccent[800]}`} />
        <DialogActions
          sx={{
            justifyContent: 'space-evenly',
          }}
          className="my-4"
        >
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          {/* <Button type="submit">Submit</Button> */}
          <Button
            type="submit"
            variant="contained"
            sx={{
              ':hover': {
                backgroundColor: 'black',
                color: 'white',
              },
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
