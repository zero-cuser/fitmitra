package com.fitmitra.feature

import com.fitmitra.core.domain.models.FitnessGoal
import com.fitmitra.core.domain.models.NoiseRating
import com.fitmitra.core.domain.models.SpaceRequirement
import com.fitmitra.feature.workout.selection.WorkoutSelectionViewModel
import org.junit.Assert.*
import org.junit.Test

class WorkoutSelectionViewModelTest {

    @Test
    fun testUpdateConstraintsUpdatesRecommendation() {
        val viewModel = WorkoutSelectionViewModel()

        var state = viewModel.uiState.value
        assertEquals(7, state.constraints.durationMinutes)
        assertTrue(state.recommendation.success)

        // Update duration
        viewModel.updateDuration(5)
        state = viewModel.uiState.value
        assertEquals(5, state.constraints.durationMinutes)
        assertEquals(5, state.recommendation.totalDurationMinutes)
        assertEquals(1, state.recommendation.items.size)

        // Update space
        viewModel.updateSpace(SpaceRequirement.SMALL)
        assertEquals(SpaceRequirement.SMALL, viewModel.uiState.value.constraints.space)

        // Update noise
        viewModel.updateNoise(NoiseRating.SILENT)
        assertEquals(NoiseRating.SILENT, viewModel.uiState.value.constraints.noiseTolerance)

        // Update goal
        viewModel.updateGoal(FitnessGoal.CARDIO)
        assertEquals(FitnessGoal.CARDIO, viewModel.uiState.value.constraints.goal)
    }
}
