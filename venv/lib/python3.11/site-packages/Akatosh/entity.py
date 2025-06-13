from __future__ import annotations

import asyncio
from math import inf
from typing import TYPE_CHECKING, Callable, List, Optional

from . import logger
from .event import Event
from .universe import Mundus

if TYPE_CHECKING:
    from .resource import Resource


class Entity:

    def __init__(
        self,
        at: float | Event,
        till: float | Event,
        label: Optional[str] = None,
        priority: int = 0,
    ) -> None:
        """Create an entity with a creation and termination event.

        Args:
            at (float | Event): when the entity is created.
            till (float | Event): when the entity is terminated.
            label (Optional[str], optional): short description to the entity. Defaults to None.
            priority (int, optional): the priority of the entity, only impacts the creation and termination event. Defaults to 0.
        """
        self._label = label
        self._at = at
        self._till = till
        self._created = False
        self._terminated = False
        self._priority = priority

        # create an instant creation event
        self._creation = Event(
            at=at,
            till=till,
            action=self._create,
            label=f"{self} Creation",
            once=True,
            priority=self.priority,
        )
        self._termination = Event(
            at=till,
            till=till,
            action=self._terminate,
            label=f"{self} Termination",
            once=True,
            priority=self.priority,
        )

        # create a queue for engaged events
        self._events: List[Event] = list()

        # create a queue for acquired resources
        self._occupied_resources: List[Resource] = list()

    def __str__(self) -> str:
        """Return the label of the entity if it exists, otherwise return the id of the entity."""
        if self.label is None:
            return f"Entity {id(self)}"
        return self.label

    def _create(self):
        """Called when the entity is created."""
        self._created = True
        logger.debug(f"Entity {self} created.")

    def _terminate(self):
        """Called when the entity is terminated."""
        self._terminated = True
        for event in self.events:
            event.cancel()
        for resource in self.occupied_resources:
            resource.collect(self, inf)
        logger.debug(f"Entity {self} terminated.")

    def event(
        self,
        at: float | Event,
        till: float | Event,
        step: float | None = None,
        label: Optional[str] = None,
        once: bool = False,
        priority: int = 0,
        watchdog: Optional[Callable] = None,
    ):
        """Decorator to add an event to the entity."""

        def _event(action: Callable):

            async def __event():

                if self.terminated:
                    logger.warn(f"Entity {self} already terminated.")
                    return

                while True:
                    if not self.created:
                        logger.warn(f"Entity {self} not created yet.")
                        await asyncio.sleep(0)
                    else:
                        break

                event = Event(
                    at=at,
                    till=till,
                    step=step,
                    action=action,
                    label=label,
                    once=once,
                    priority=priority,
                    watchdog=watchdog,
                )
                self.events.append(event)
                logger.debug(f"Event {event} added to entity {self}.")

            Event(
                at=at, till=at, action=__event, label=f"{label} Engagement", once=True
            )

        return _event

    def acquire(self, resource: Resource, amount: float) -> bool:
        """Acquire a amount from the resource."""
        if resource.distribute(self, amount):
            return True
        else:
            return False

    def release(self, resource: Resource, amount: float) -> bool:
        """Release a amount from the resource."""
        if resource.collect(self, amount):
            return True
        else:
            return False

    @property
    def label(self):
        """Short description of the entity."""
        return self._label

    @property
    def created(self):
        """Return True if the entity is created, otherwise False."""
        return self._created

    @property
    def terminated(self):
        """Return True if the entity is terminated, otherwise False."""
        return self._terminated

    @property
    def events(self):
        """The events that the entity is engaged with."""
        return self._events

    @property
    def occupied_resources(self):
        """The resources that the entity is using."""
        return self._occupied_resources

    @property
    def priority(self):
        """The priority of the entity."""
        return self._priority

    @property
    def creation(self):
        """The creation event of the entity."""
        return self._creation

    @property
    def termination(self):
        """The termination event of the entity."""
        return self._termination
