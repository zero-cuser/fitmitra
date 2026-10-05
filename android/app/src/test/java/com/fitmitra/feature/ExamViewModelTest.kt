package com.fitmitra.feature

import com.fitmitra.core.domain.exam.ExamModeType
import com.fitmitra.feature.exam.ExamViewModel
import org.junit.Assert.*
import org.junit.Test

class ExamViewModelTest {

    @Test
    fun testModeSelectionAndSessionStart() {
        val viewModel = ExamViewModel()

        assertEquals(ExamModeType.RESET, viewModel.uiState.value.selectedMode)
        assertFalse(viewModel.uiState.value.isSessionActive)

        viewModel.selectMode(ExamModeType.BREAK)
        assertEquals(ExamModeType.BREAK, viewModel.uiState.value.selectedMode)

        viewModel.startSession()
        assertTrue(viewModel.uiState.value.isSessionActive)
        assertEquals(0, viewModel.uiState.value.activityIndex)
        assertTrue(viewModel.uiState.value.currentActivityName.isNotBlank())

        viewModel.endSession()
        assertFalse(viewModel.uiState.value.isSessionActive)
    }
}
