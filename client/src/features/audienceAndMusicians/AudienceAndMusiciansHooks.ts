import {
  Button,
  Card,
  Classes,
  Colors,
  Dialog,
  Divider,
  FormGroup,
  H4,
  H5,
  Icon,
  InputGroup,
  ControlGroup,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import _ from 'lodash';
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useDispatch, useSelector } from 'react-redux';

import styles from './AudienceAndMusicians.module.css';
import { usePatch } from '../feathers/FeathersHooks';
import {
  addMusicians,
  selectMusicians,
  updateMusicians,
} from '../musicians/musiciansSlice';
import { selectRecordingState } from '../recording/recordingSlice';
import { selectRoom, updateChain } from '../room/roomSlice';
import { useFind } from '../feathers/FeathersHooks';

interface IPerson {
  id: string;
  name: string;
}

interface ListState {
  audience: {
    id: 'audience';
    items: IPerson[];
  };
  musicians: {
    id: 'musicians';
    items: IPerson[];
  };
}

const DEFAULT_LIST_STATE: ListState = {
  audience: {
    id: 'audience',
    items: [],
  },
  musicians: {
    id: 'musicians',
    items: [],
  },
};

export function reorderList(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}

function withUpdatedMusicianName(column, musicians, musicianId) {
  if (!musicianId || !musicians[musicianId]) return column;
  const myItemIndex = _.findIndex(column.items, ['id', musicianId]);
  if (myItemIndex === -1) return column;

  return {
    ...column,
    items: [
      ..._.slice(column.items, 0, myItemIndex),
      musicians[musicianId],
      ..._.slice(column.items, myItemIndex + 1),
    ],
  };
}

export function useLists() {
  const [listsState, setListsState] = useState<ListState>(DEFAULT_LIST_STATE);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);

  const dispatch = useDispatch();
  const { musicianId, musicianIdsChain, id: roomId } = useSelector(selectRoom);
  const musicians = useSelector(selectMusicians);

  const [patchRoom] = usePatch('rooms');

  const audienceColumn = withUpdatedMusicianName(
    listsState.audience,
    musicians,
    musicianId
  );
  const musiciansColumn = withUpdatedMusicianName(
    listsState.musicians,
    musicians,
    musicianId
  );

  useFind('musicians', {
    pollingInterval: 1000,
    onUpdate: musicians => {
      const musiciansById = _.keyBy(musicians, 'id');
      // NOTE(gnewman): It's possible/likely that we will get an updated ID
      // chain before the updated musician list. We want to filter out these
      // cases for this pass, until the inconsistency is resolved.
      const musicianIdsWeKnowAbout = _.filter(musicianIdsChain, id =>
        _.has(musiciansById, id)
      );
      const musiciansInOrder = _.map(
        musicianIdsWeKnowAbout,
        id => musiciansById[id]
      );
      const alreadyPresentAudienceIds = _.filter(
        _.map(audienceColumn.items, 'id'),
        id => _.has(musiciansById, id)
      );
      const audienceInOrder = _.reject(
        [
          ..._.map(alreadyPresentAudienceIds, id => musiciansById[id]),
          ..._.filter(
            musicians,
            ({ id }) =>
              !_.includes(musicianIdsWeKnowAbout, id) &&
              !_.includes(alreadyPresentAudienceIds, id)
          ),
        ],
        ({ id }) => _.some(musiciansInOrder, ['id', id])
      );

      setListsState({
        audience: {
          id: 'audience',
          items: audienceInOrder,
        },
        musicians: {
          id: 'musicians',
          items: musiciansInOrder,
        },
      });
      // Only adds new musicians
      dispatch(addMusicians(musiciansById));
      // Only update names of other musicians (we don't want the server telling
      // us what our name should be)
      dispatch(updateMusicians(_.omit(musiciansById, musicianId || '')));
    },
  });

  function onDragStart(start) {
    setDragSourceId(start.source.droppableId);
  }

  function onDragEnd(result) {
    if (!result.destination) {
      return;
    }

    const reorderWithinList = () => {
      const column = listsState[result.source.droppableId];
      const items = reorderList(
        column.items,
        result.source.index,
        result.destination.index
      );

      // updating column entry
      return {
        ...listsState,
        [column.id]: {
          ...column,
          items,
        },
      };
    };
    const moveBetweenLists = () => {
      // moving between lists
      const sourceColumn = listsState[result.source.droppableId];
      const destinationColumn = listsState[result.destination.droppableId];
      const item = sourceColumn.items[result.source.index];

      // 1. remove item from source column
      const newSourceColumn = {
        ...sourceColumn,
        items: [...sourceColumn.items],
      };
      newSourceColumn.items.splice(result.source.index, 1);

      // 2. insert into destination column
      const newDestinationColumn = {
        ...destinationColumn,
        items: [...destinationColumn.items],
      };
      // in line modification of items
      newDestinationColumn.items.splice(result.destination.index, 0, item);

      return {
        ...listsState,
        [newSourceColumn.id]: newSourceColumn,
        [newDestinationColumn.id]: newDestinationColumn,
      };
    };

    const newState =
      result.source.droppableId === result.destination.droppableId
        ? reorderWithinList()
        : moveBetweenLists();

    setListsState(newState);
    if (
      result.source.droppableId === 'musicians' ||
      result.destination.droppableId === 'musicians'
    ) {
      const newMusicianIdsChain = _.map(newState.musicians.items, 'id');
      dispatch(updateChain({ musicianIdsChain: newMusicianIdsChain }));
      patchRoom(roomId, {
        musicianIdsChain: newMusicianIdsChain,
      });
    }
  }

  return {
    audienceColumn,
    musiciansColumn,
    onDragStart,
    onDragEnd,
    dragSourceId,
  };
}
